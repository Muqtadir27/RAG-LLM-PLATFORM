from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from rag.eval import score_answer
from rag.retrieve import retrieve_chunks
from rag.generate import generate_answer

router = APIRouter(prefix="/eval", tags=["Evaluation"])


class EvalRequest(BaseModel):
    question: str
    answer: str | None = None
    document_id: str | None = None


def get_session(x_session_id: str | None) -> str:
    if not x_session_id:
        raise HTTPException(400, "Missing X-Session-Id header")
    return x_session_id


@router.post("/score")
async def eval_single(
    request: EvalRequest,
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
        raise HTTPException(404, "No documents found. Upload a PDF first.")

    answer = request.answer if request.answer else generate_answer(
        question=request.question,
        context_chunks=chunks
    )

    eval_result = score_answer(
        question=request.question,
        answer=answer,
        context_chunks=chunks
    )

    return {
        "question": request.question,
        "answer": answer,
        "sources": sources,
        "eval": eval_result,
        "document_id": request.document_id
    }


@router.get("/health")
def eval_health():
    return {"status": "eval pipeline active"}