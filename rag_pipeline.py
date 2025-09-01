

# from dotenv import load_dotenv
# load_dotenv()

# from langchain_groq import ChatGroq
# from langchain_core.prompts import ChatPromptTemplate
# from vector_database import get_vectorstore

# llm_model = ChatGroq(model="deepseek-r1-distill-llama-70b")

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

# custom_prompt_template = """
# Use only the context below to answer the question.
# If the context doesn't contain the answer, say "I don't know".

# Question: {question}
# Context: {context}
# Answer:
# """

# def answer_query(documents, model, query):
#     context = get_context(documents)
#     if not context.strip():
#         return "⚠️ No context found. Try re-uploading your file."
#     prompt = ChatPromptTemplate.from_template(custom_prompt_template)
#     chain = prompt | model
#     return chain.invoke({"question": query, "context": context})


# rag_pipeline.py
# rag_pipeline.py
import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from vector_database import get_vectorstore
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

def retrieve_docs(query, k=4):
    try:
        print(f"🔍 Querying Pinecone for: {query}")
        vectorstore = get_vectorstore()
        results = vectorstore.similarity_search(query, k=k)
        print(f"✅ Retrieved {len(results)} relevant chunks.")
        return results
    except Exception as e:
        print(f"❌ Retrieval failed: {e}")
        return []

def get_context(documents):
    return "\n\n".join([doc.page_content for doc in documents])

# ✅ Prompt for Legal Assistant
custom_prompt_template = """
You are an AI legal assistant. Follow these rules carefully:

1. Answer legal questions (laws, contracts, compliance, regulations) using the provided context.
2. If the context is empty, rely on your legal knowledge to help.
3. Be concise, clear, and professional.
4. If the question is unrelated to law, reply:
   "I am a legal assistant and can only answer law-related questions."

Question: {question}
Context: {context}

Answer:
"""

def answer_query(query, k=4):
    documents = retrieve_docs(query, k)
    context = get_context(documents)

    prompt = ChatPromptTemplate.from_template(custom_prompt_template).format(
        question=query, context=context
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",  # fast + cheap + strong
        messages=[
            {"role": "system", "content": "You are a helpful AI lawyer."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=500
    )

    return response.choices[0].message.content.strip()
