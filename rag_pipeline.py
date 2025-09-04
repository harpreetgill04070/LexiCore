

# # from dotenv import load_dotenv
# # load_dotenv()

# # from langchain_groq import ChatGroq
# # from langchain_core.prompts import ChatPromptTemplate
# # from vector_database import get_vectorstore

# # llm_model = ChatGroq(model="deepseek-r1-distill-llama-70b")

# # def retrieve_docs(query, k=4):
# #     try:
# #         print(f"🔍 Querying Pinecone for: {query}")
# #         vectorstore = get_vectorstore()
# #         results = vectorstore.similarity_search(query, k=k)
# #         print(f"✅ Retrieved {len(results)} relevant chunks.")
# #         return results
# #     except Exception as e:
# #         print(f"❌ Retrieval failed: {e}")
# #         return []

# # def get_context(documents):
# #     return "\n\n".join([doc.page_content for doc in documents])

# # custom_prompt_template = """
# # Use only the context below to answer the question.
# # If the context doesn't contain the answer, say "I don't know".

# # Question: {question}
# # Context: {context}
# # Answer:
# # """

# # def answer_query(documents, model, query):
# #     context = get_context(documents)
# #     if not context.strip():
# #         return "⚠️ No context found. Try re-uploading your file."
# #     prompt = ChatPromptTemplate.from_template(custom_prompt_template)
# #     chain = prompt | model
# #     return chain.invoke({"question": query, "context": context})


# # rag_pipeline.py
# # rag_pipeline.py
# import os
# from dotenv import load_dotenv
# from langchain_core.prompts import ChatPromptTemplate
# from vector_database import get_vectorstore
# from openai import OpenAI

# load_dotenv()

# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# client = OpenAI(api_key=OPENAI_API_KEY)

# def retrieve_docs(query, k=4):
#     try:
#         print(f"🔍 Querying Pinecone for: {query}")
#         vectorstore = get_vectorstore()
#         results = vectorstore.similarity_search(query, k=k)
#         print(f"✅ Retrieved {len(results)} relevant chunks.")
#         return results
#     except Exception as e:
#         print(f"❌ Retrieval failed: {e}")
#         return []

# def get_context(documents):
#     return "\n\n".join([doc.page_content for doc in documents])

# # ✅ Prompt for Legal Assistant
# custom_prompt_template = """
# You are an AI legal assistant. Follow these rules carefully:

# 1. Answer legal questions (laws, contracts, compliance, regulations) using the provided context.
# 2. If the context is empty, rely on your legal knowledge to help.
# 3. Be concise, clear, and professional.
# 4. If the question is unrelated to law, reply:
#    "I am a legal assistant and can only answer law-related questions."

# Question: {question}
# Context: {context}

# Answer:
# """

# def answer_query(query, k=4):
#     documents = retrieve_docs(query, k)
#     context = get_context(documents)

#     prompt = ChatPromptTemplate.from_template(custom_prompt_template).format(
#         question=query, context=context
#     )

#     response = client.chat.completions.create(
#         model="gpt-4o-mini",  # fast + cheap + strong
#         messages=[
#             {"role": "system", "content": "You are a helpful AI lawyer."},
#             {"role": "user", "content": prompt}
#         ],
#         temperature=0.3,
#         max_tokens=500
#     )

#     return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------------------


# rag_pipeline.py
import json
import os
from typing import Optional, Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain.schema import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from vector_database import get_retriever

PROMPTS_PATH = os.path.join("prompts", "prompts.json")

def _load_prompts() -> Dict[str, Any]:
    if not os.path.exists(PROMPTS_PATH):
        return {"shared": {}, "private": {}}
    with open(PROMPTS_PATH, "r") as f:
        return json.load(f)

def _resolve_prompt(task: str, prompt_key: Optional[str], custom_prompt: Optional[str]) -> str:
    # precedence: custom > prompt_key > sensible default per task
    if custom_prompt:
        return custom_prompt

    prompts = _load_prompts().get("shared", {})
    if prompt_key and prompt_key in prompts:
        return prompts[prompt_key]

    defaults = {
        "qa": "You are a precise legal assistant. Using ONLY the provided context, answer the user's query. If the answer is not in the context, say you don't know and suggest what to look for.",
        "summarize": "Summarize for a lawyer: parties, purpose, key obligations, deadlines, term/termination, payments, governing law, notable risks.",
        "identify_risks": "List legal/commercial risks from the context. Include clause reference (if any), explanation, severity (Low/Med/High), and mitigation.",
        "draft_email": "Draft a concise, professional email to a client summarizing the document and implications. Include 3–5 bullet points and next steps.",
    }
    return defaults.get(task, defaults["qa"])

def _make_prompt(template: str) -> ChatPromptTemplate:
    system = (
        "{template}\n\n"
        "Rules:\n"
        "- Cite with (Source: <filename>[, p.<page>]) using the provided context only.\n"
        "- If context is insufficient, say so.\n"
        "- Keep answers clear and structured for lawyers.\n"
    )
    return ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("human", "User question: {question}\n\nContext:\n{context}"),
        ]
    ).partial(template=template)

def _format_context(docs: List[Document]) -> str:
    chunks = []
    for d in docs:
        src = d.metadata.get("source")
        page = d.metadata.get("page")
        header = f"[Source: {src}{', p.'+str(page) if page is not None else ''}]"
        chunks.append(f"{header}\n{d.page_content}")
    return "\n\n---\n\n".join(chunks)

def _extract_citations(docs: List[Document]) -> List[Dict[str, Any]]:
    cites = []
    for d in docs:
        cites.append(
            {
                "source": d.metadata.get("source"),
                "page": d.metadata.get("page"),
                "filetype": d.metadata.get("filetype"),
            }
        )
    # de-duplicate
    uniq = []
    seen = set()
    for c in cites:
        key = (c["source"], c["page"])
        if key not in seen:
            seen.add(key)
            uniq.append(c)
    return uniq

def answer_query(
    question: str,
    task: str = "qa",  # one of: qa, summarize, identify_risks, draft_email
    file: Optional[str] = None,  # restrict retrieval to a single file (filename)
    top_k: int = 6,
    prompt_key: Optional[str] = None,
    custom_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns: {"answer": str, "sources": [{"source": "...", "page": 3}, ...]}
    """
    template = _resolve_prompt(task, prompt_key, custom_prompt)
    retriever = get_retriever(k=top_k, file_filter=file)
    docs = retriever.get_relevant_documents(question)
    context = _format_context(docs)

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
    prompt = _make_prompt(template)
    chain = prompt | llm | StrOutputParser()
    answer = chain.invoke({"question": question, "context": context})

    sources = _extract_citations(docs)
    return {"answer": answer, "sources": sources}
