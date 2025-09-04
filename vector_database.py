# # vector_database.py

# # vector_database.py
# import os
# import concurrent.futures
# from dotenv import load_dotenv
# from langchain_community.document_loaders import PDFPlumberLoader
# from langchain_text_splitters import RecursiveCharacterTextSplitter
# from langchain_openai import OpenAIEmbeddings
# from langchain_pinecone import PineconeVectorStore
# from pinecone import Pinecone, ServerlessSpec

# load_dotenv()

# PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# INDEX_NAME = "lexicore"
# pdfs_directory = "pdfs/"

# # 🔧 Initialize Pinecone
# pc = Pinecone(api_key=PINECONE_API_KEY)

# # 🔧 Setup OpenAI Embedding Model
# embedding_model = OpenAIEmbeddings(
#     model="text-embedding-3-small",  # cheap + fast, 1536 dimensions
#     api_key=OPENAI_API_KEY
# )
# EMBEDDING_DIM = 1536

# # 🔧 Ensure Pinecone index exists
# existing_indexes = [i["name"] for i in pc.list_indexes()]
# if INDEX_NAME not in existing_indexes:
#     print(f"📌 Creating Pinecone index: {INDEX_NAME}")
#     pc.create_index(
#         name=INDEX_NAME,
#         dimension=EMBEDDING_DIM,
#         metric="cosine",
#         spec=ServerlessSpec(cloud="aws", region="us-east-1")
#     )
# else:
#     print(f"✅ Pinecone index '{INDEX_NAME}' already exists.")

# # ---- PDF & Chunk Handling ----
# def upload_pdf(file):
#     os.makedirs(pdfs_directory, exist_ok=True)
#     with open(os.path.join(pdfs_directory, file.name), "wb") as f:
#         f.write(file.getbuffer())

# def load_pdf(file_path):
#     loader = PDFPlumberLoader(file_path)
#     return loader.load()

# def create_chunks(documents):
#     splitter = RecursiveCharacterTextSplitter(
#         chunk_size=800,
#         chunk_overlap=100,
#         add_start_index=True
#     )
#     return splitter.split_documents(documents)

# # ---- Embedding + Upsert ----
# def store_in_pinecone(documents):
#     print(f"🔄 Generating embeddings for {len(documents)} chunks...")
#     texts = [doc.page_content for doc in documents]

#     with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
#         embeddings = list(executor.map(embedding_model.embed_query, texts))

#     vectors = [
#         {"id": f"doc-{i}", "values": emb, "metadata": {"text": doc.page_content}}
#         for i, (doc, emb) in enumerate(zip(documents, embeddings))
#     ]

#     print(f"🚀 Uploading {len(vectors)} vectors to Pinecone...")
#     index = pc.Index(INDEX_NAME)

#     batch_size = 100
#     for i in range(0, len(vectors), batch_size):
#         index.upsert(vectors=vectors[i:i+batch_size])

#     print("✅ All vectors uploaded to Pinecone.")

# def get_vectorstore():
#     return PineconeVectorStore(index_name=INDEX_NAME, embedding=embedding_model)

# -----------------------------------------------------------------------------------------------


# vector_database.py
import os
import uuid
import concurrent.futures
from typing import List
from dotenv import load_dotenv
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec
from langchain.schema import Document
from docx import Document as DocxDocument
import pandas as pd
from zipfile import ZipFile

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

INDEX_NAME = "lexicore"
uploads_dir = "pdfs"   # keep existing path, but we’ll store all file types here
os.makedirs(uploads_dir, exist_ok=True)

# ---- Pinecone + Embeddings ----
pc = Pinecone(api_key=PINECONE_API_KEY)

embedding_model = OpenAIEmbeddings(
    model="text-embedding-3-small",
    api_key=OPENAI_API_KEY,
)
EMBEDDING_DIM = 1536

existing = [i["name"] for i in pc.list_indexes()]
if INDEX_NAME not in existing:
    print(f"📌 Creating Pinecone index: {INDEX_NAME}")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIM,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
else:
    print(f"✅ Pinecone index '{INDEX_NAME}' already exists.")

# ---- Helpers: loaders for multiple types ----
def _load_pdf(path: str) -> List[Document]:
    loader = PDFPlumberLoader(path)
    docs = loader.load()
    # metadata already has 'source' and 'page' — normalize source to filename
    for d in docs:
        d.metadata["source"] = os.path.basename(d.metadata.get("source", path))
        d.metadata["filetype"] = "pdf"
        d.metadata["path"] = path
    return docs

def _load_docx(path: str) -> List[Document]:
    doc = DocxDocument(path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    text = "\n".join(paragraphs)
    md = {"source": os.path.basename(path), "filetype": "docx", "path": path}
    return [Document(page_content=text, metadata=md)]

def _load_xlsx(path: str) -> List[Document]:
    xl = pd.ExcelFile(path)
    docs = []
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        text = df.to_csv(index=False)
        md = {
            "source": os.path.basename(path),
            "filetype": "xlsx",
            "sheet": sheet,
            "path": path,
        }
        docs.append(Document(page_content=text, metadata=md))
    return docs

def _load_zip(path: str) -> List[Document]:
    out = []
    extract_dir = os.path.join(uploads_dir, f"unzipped_{uuid.uuid4().hex[:8]}")
    os.makedirs(extract_dir, exist_ok=True)
    with ZipFile(path, "r") as z:
        z.extractall(extract_dir)
    for root, _, files in os.walk(extract_dir):
        for name in files:
            out.extend(load_any(os.path.join(root, name)))
    return out

def load_any(path: str) -> List[Document]:
    low = path.lower()
    if low.endswith(".pdf"):
        return _load_pdf(path)
    if low.endswith(".docx"):
        return _load_docx(path)
    if low.endswith(".xlsx"):
        return _load_xlsx(path)
    if low.endswith(".zip"):
        return _load_zip(path)
    # ignore other types
    return []

def create_chunks(documents: List[Document]) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=120,
        add_start_index=True,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    # preserve key metadata explicitly
    for i, c in enumerate(chunks):
        c.metadata["chunk_id"] = i
        c.metadata["source"] = os.path.basename(c.metadata.get("source", ""))
    return chunks

def store_in_pinecone(documents: List[Document]) -> None:
    if not documents:
        return
    print(f"🔄 Generating embeddings for {len(documents)} chunks...")
    texts = [d.page_content for d in documents]
    # batch embed (keeps order)
    embeddings = embedding_model.embed_documents(texts)

    # compose metadata (text + useful fields)
    vectors = []
    for d, emb in zip(documents, embeddings):
        meta = {
            "text": d.page_content,
            "source": d.metadata.get("source"),
            "page": d.metadata.get("page"),
            "sheet": d.metadata.get("sheet"),
            "filetype": d.metadata.get("filetype"),
            "path": d.metadata.get("path"),
        }
        vectors.append(
            {
                "id": uuid.uuid4().hex,
                "values": emb,
                "metadata": meta,
            }
        )

    index = pc.Index(INDEX_NAME)
    print(f"🚀 Uploading {len(vectors)} vectors to Pinecone...")
    batch = 100
    for i in range(0, len(vectors), batch):
        index.upsert(vectors=vectors[i : i + batch])
    print("✅ All vectors uploaded to Pinecone.")

def get_vectorstore() -> PineconeVectorStore:
    return PineconeVectorStore(index_name=INDEX_NAME, embedding=embedding_model)

def get_retriever(k: int = 6, file_filter: str | None = None):
    store = get_vectorstore()
    search_kwargs = {"k": k}
    filter_ = None
    if file_filter:
        # exact match on filename stored as metadata 'source'
        filter_ = {"source": {"$eq": os.path.basename(file_filter)}}
    return store.as_retriever(search_kwargs=search_kwargs, filter=filter_)
