from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import os, shutil, uuid

from fastapi.responses import JSONResponse

from rag.ingest import ingest_pdf
from rag.embed import QdrantUnavailable, check_qdrant
from rag.retrieve import retrieve_chunks, cleanup_old_sessions
from rag.generate import generate_answer
from eval_router import router as eval_router

load_dotenv()

# FIX: Use lifespan instead of deprecated @app.on_event("startup")
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        cleanup_old_sessions(max_age_hours=24)
    except Exception as e:
        print(f"[Startup] Cleanup skipped: {e}")
    yield

app = FastAPI(title="RAG Platform v2", version="2.0.0", lifespan=lifespan)

# FIX: Robust CORS handling. Supports comma-separated URLs in FRONTEND_URL.
frontend_url_env = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [url.strip() for url in frontend_url_env.split(",") if url.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(eval_router)


@app.exception_handler(QdrantUnavailable)
async def qdrant_unavailable_handler(request, exc: QdrantUnavailable):
    # Clean 503 instead of an unhandled 500 + stack trace
    print(f"[Qdrant] Unavailable after retries: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Vector database is unreachable right now. Please try again in a moment."},
    )

# FIX: Use absolute path so it works regardless of working directory (e.g., on Render)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QueryRequest(BaseModel):
    question: str
    document_id: str | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]
    document_id: str | None = None


def get_session(x_session_id: str | None) -> str:
    if not x_session_id:
        raise HTTPException(400, "Missing X-Session-Id header")
    return x_session_id


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/health/deps")
def health_deps():
    """Checks that the backend can actually reach Qdrant (no secrets in the response)."""
    result = check_qdrant()
    return JSONResponse(status_code=200 if result["ok"] else 503, content=result)


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    x_session_id: str | None = Header(default=None)
):
    session_id = get_session(x_session_id)

    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported currently")

    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        chunk_count = ingest_pdf(file_path, doc_id, file.filename, session_id)
        return {
            "success": True,
            "document_id": doc_id,
            "filename": file.filename,
            "chunks": chunk_count,
            "message": f"Successfully processed {chunk_count} chunks"
        }
    except QdrantUnavailable:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise  # handled above as a clean 503
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(500, f"Processing failed: {str(e)}")


@app.post("/query", response_model=QueryResponse)
async def query_documents(
    request: QueryRequest,
    x_session_id: str | None = Header(default=None)
):
    session_id = get_session(x_session_id)

    if not request.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    chunks, sources = retrieve_chunks(
        question=request.question,
        session_id=session_id,
        document_id=request.document_id
    )

    if not chunks:
        raise HTTPException(404, "No relevant documents found. Please upload a PDF first.")

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
def list_documents(x_session_id: str | None = Header(default=None)):
    session_id = get_session(x_session_id)
    from rag.retrieve import list_all_documents
    docs = list_all_documents(session_id)
    return {"documents": docs, "count": len(docs)}


@app.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    x_session_id: str | None = Header(default=None)
):
    session_id = get_session(x_session_id)
    from rag.retrieve import delete_document_chunks
    deleted = delete_document_chunks(document_id, session_id)
    if not deleted:
        raise HTTPException(404, "Document not found")
    return {"success": True, "message": f"Document {document_id} deleted"}