from rag.embed import get_collection


def retrieve_chunks(
    question: str,
    document_id: str | None = None,
    top_k: int = 8
) -> tuple[list[str], list[str]]:
    """
    Find the most relevant chunks for a question.
    top_k=8 gives more context for better answers.
    """
    collection = get_collection()

    # Check total docs in collection
    total = collection.count()
    if total == 0:
        return [], []

    # Use smaller top_k if collection has fewer items
    actual_k = min(top_k, total)

    where = {"doc_id": document_id} if document_id else None

    results = collection.query(
        query_texts=[question],
        n_results=actual_k,
        where=where,
        include=["documents", "metadatas", "distances"]
    )

    chunks = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []

    sources = [
        f"{m['filename']} (chunk {m['chunk_index']})"
        for m in metadatas
    ]

    return chunks, sources


def list_all_documents() -> list[dict]:
    """List all unique documents in ChromaDB."""
    collection = get_collection()
    results = collection.get(include=["metadatas"])

    seen = {}
    for meta in results["metadatas"]:
        doc_id = meta["doc_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "document_id": doc_id,
                "filename": meta["filename"]
            }

    return list(seen.values())


def delete_document_chunks(document_id: str) -> bool:
    """Delete all chunks for a document."""
    collection = get_collection()

    results = collection.get(
        where={"doc_id": document_id},
        include=["metadatas"]
    )

    if not results["ids"]:
        return False

    collection.delete(ids=results["ids"])
    return True