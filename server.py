
# # server.py
# import os
# from fastapi import FastAPI, UploadFile, File
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from rag_pipeline import answer_query
# from vector_database import load_pdf, create_chunks, store_in_pinecone

# app = FastAPI()

# # Allow frontend requests
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # in production, restrict to frontend domain
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# pdfs_directory = "pdfs/"
# os.makedirs(pdfs_directory, exist_ok=True)

# # -------- Upload API --------
# @app.post("/api/upload")
# async def upload(file: UploadFile = File(...)):
#     try:
#         file_path = os.path.join(pdfs_directory, file.filename)

#         with open(file_path, "wb") as f:
#             f.write(await file.read())

#         documents = load_pdf(file_path)
#         chunks = create_chunks(documents)
#         store_in_pinecone(chunks)

#         return {"status": "success", "message": f"{file.filename} uploaded and indexed."}
#     except Exception as e:
#         return {"status": "error", "message": str(e)}

# # -------- Ask API --------
# class AskRequest(BaseModel):
#     question: str

# @app.post("/api/ask")
# async def ask(req: AskRequest):
#     try:
#         answer = answer_query(req.question)
#         return {"answer": str(answer)}
#     except Exception as e:
#         return {"status": "error", "message": str(e)}

# ----------------------------------------------------------------------------



# server.py
import os
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_pipeline import answer_query
from vector_database import load_any, create_chunks, store_in_pinecone

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ⚠️ tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = "pdfs"
os.makedirs(uploads_dir, exist_ok=True)

# ---------- Upload API (multi-file, multi-type) ----------
@app.post("/api/upload")
async def upload(files: List[UploadFile] = File(...)):
    processed = []
    try:
        for uf in files:
            path = os.path.join(uploads_dir, uf.filename)
            with open(path, "wb") as f:
                f.write(await uf.read())

            # load -> chunk -> upsert
            docs = load_any(path)
            chunks = create_chunks(docs)
            store_in_pinecone(chunks)
            processed.append(uf.filename)

        return {"status": "success", "message": f"Indexed: {processed}", "files": processed}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ---------- Files API (list/delete) ----------
@app.get("/api/files")
async def list_files():
    try:
        files = sorted(os.listdir(uploads_dir))
        return {"status": "success", "files": files}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/files/{filename}")
async def delete_file(filename: str):
    try:
        path = os.path.join(uploads_dir, filename)
        if os.path.exists(path):
            os.remove(path)
            return {"status": "success", "message": f"{filename} deleted."}
        return {"status": "error", "message": "File not found."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ---------- Prompts API (simple shared library) ----------
PROMPTS_PATH = os.path.join("prompts", "prompts.json")
os.makedirs("prompts", exist_ok=True)
if not os.path.exists(PROMPTS_PATH):
    with open(PROMPTS_PATH, "w") as f:
        json.dump({"shared": {}, "private": {}}, f)

def _read_prompts():
    with open(PROMPTS_PATH, "r") as f:
        return json.load(f)

def _write_prompts(data):
    with open(PROMPTS_PATH, "w") as f:
        json.dump(data, f, indent=2)

class PromptCreate(BaseModel):
    key: str
    template: str
    scope: str = "shared"  # or "private" (no auth wired yet)

@app.get("/api/prompts")
async def get_prompts():
    return _read_prompts()

@app.post("/api/prompts")
async def add_prompt(p: PromptCreate):
    data = _read_prompts()
    data.setdefault(p.scope, {})
    data[p.scope][p.key] = p.template
    _write_prompts(data)
    return {"status": "success"}

@app.delete("/api/prompts/{scope}/{key}")
async def delete_prompt(scope: str, key: str):
    data = _read_prompts()
    if scope in data and key in data[scope]:
        del data[scope][key]
        _write_prompts(data)
        return {"status": "success"}
    return {"status": "error", "message": "Not found"}

# ---------- Ask API (tasks + optional file restriction + citations) ----------
class AskRequest(BaseModel):
    question: str
    task: str = "qa"  # "qa" | "summarize" | "identify_risks" | "draft_email"
    file: Optional[str] = None
    top_k: int = 6
    promptKey: Optional[str] = None
    customPrompt: Optional[str] = None

@app.post("/api/ask")
async def ask(req: AskRequest):
    try:
        result = answer_query(
            question=req.question,
            task=req.task,
            file=req.file,
            top_k=req.top_k,
            prompt_key=req.promptKey,
            custom_prompt=req.customPrompt,
        )
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

