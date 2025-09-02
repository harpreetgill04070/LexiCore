# vector_database.py

# vector_database.py
import os
import concurrent.futures
from dotenv import load_dotenv
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

INDEX_NAME = "ai-lawyer-index"
pdfs_directory = "pdfs/"

# 🔧 Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)

# 🔧 Setup OpenAI Embedding Model
embedding_model = OpenAIEmbeddings(
    model="text-embedding-3-small",  # cheap + fast, 1536 dimensions
    api_key=OPENAI_API_KEY
)
EMBEDDING_DIM = 1536

# 🔧 Ensure Pinecone index exists
existing_indexes = [i["name"] for i in pc.list_indexes()]
if INDEX_NAME not in existing_indexes:
    print(f"📌 Creating Pinecone index: {INDEX_NAME}")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIM,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
else:
    print(f"✅ Pinecone index '{INDEX_NAME}' already exists.")

# ---- PDF & Chunk Handling ----
def upload_pdf(file):
    os.makedirs(pdfs_directory, exist_ok=True)
    with open(os.path.join(pdfs_directory, file.name), "wb") as f:
        f.write(file.getbuffer())

def load_pdf(file_path):
    loader = PDFPlumberLoader(file_path)
    return loader.load()

def create_chunks(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        add_start_index=True
    )
    return splitter.split_documents(documents)

# ---- Embedding + Upsert ----
def store_in_pinecone(documents):
    print(f"🔄 Generating embeddings for {len(documents)} chunks...")
    texts = [doc.page_content for doc in documents]

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        embeddings = list(executor.map(embedding_model.embed_query, texts))

    vectors = [
        {"id": f"doc-{i}", "values": emb, "metadata": {"text": doc.page_content}}
        for i, (doc, emb) in enumerate(zip(documents, embeddings))
    ]

    print(f"🚀 Uploading {len(vectors)} vectors to Pinecone...")
    index = pc.Index(INDEX_NAME)

    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        index.upsert(vectors=vectors[i:i+batch_size])

    print("✅ All vectors uploaded to Pinecone.")

def get_vectorstore():
    return PineconeVectorStore(index_name=INDEX_NAME, embedding=embedding_model)
