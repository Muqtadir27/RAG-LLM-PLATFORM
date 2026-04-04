from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os, shutil, uuid

from rag.ingest import ingest_pdf
from rag.retrieve import retrieve_chunks
from rag.generate import generate_answer

load_dotenv()

app = FastAPI(title="RAG Platform v2", version="2.0.0")

# CORS - allows frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "backend/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QueryRequest(BaseModel):
    question: str
    document_id: str | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]
    document_id: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported currently")

    # Save file with unique ID
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Process and embed the PDF
    try:
        chunk_count = ingest_pdf(file_path, doc_id, file.filename)
        return {
            "success": True,
            "document_id": doc_id,
            "filename": file.filename,
            "chunks": chunk_count,
            "message": f"Successfully processed {chunk_count} chunks"
        }
    except Exception as e:
        # Clean up file if processing failed
        os.remove(file_path)
        raise HTTPException(500, f"Processing failed: {str(e)}")


@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    # Retrieve relevant chunks from ChromaDB
    chunks, sources = retrieve_chunks(
        question=request.question,
        document_id=request.document_id
    )

    if not chunks:
        raise HTTPException(404, "No relevant documents found. Please upload a PDF first.")

    # Generate answer using GLM-4.7
    answer = generate_answer(
        question=request.question,
        context_chunks=chunks
    )

    return QueryResponse(
        answer=answer,
        sources=sources,
        document_id=request.document_id
    )


@app.get("/documents")
def list_documents():
    from rag.retrieve import list_all_documents
    docs = list_all_documents()
    return {"documents": docs, "count": len(docs)}


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    from rag.retrieve import delete_document_chunks
    deleted = delete_document_chunks(document_id)
    if not deleted:
        raise HTTPException(404, "Document not found")
    return {"success": True, "message": f"Document {document_id} deleted"}