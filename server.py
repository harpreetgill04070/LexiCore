
# server.py
import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_pipeline import answer_query
from vector_database import load_pdf, create_chunks, store_in_pinecone

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pdfs_directory = "pdfs/"
os.makedirs(pdfs_directory, exist_ok=True)

# -------- Upload API --------
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(pdfs_directory, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        documents = load_pdf(file_path)
        chunks = create_chunks(documents)
        store_in_pinecone(chunks)

        return {"status": "success", "message": f"{file.filename} uploaded and indexed."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# -------- Ask API --------
class AskRequest(BaseModel):
    question: str

@app.post("/api/ask")
async def ask(req: AskRequest):
    try:
        answer = answer_query(req.question)
        return {"answer": str(answer)}
    except Exception as e:
        return {"status": "error", "message": str(e)}
