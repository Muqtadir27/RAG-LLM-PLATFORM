from rag.embed import get_collection


def retrieve_chunks(
    question: str,
    document_id: str | None = None,
    top_k: int = 5
) -> tuple[list[str], list[str]]:
    """
    Find most relevant chunks for a question using vector similarity.
    Returns (chunks, sources).
    """
    collection = get_collection()

    # Filter by specific document if provided
    where = {"doc_id": document_id} if document_id else None

    results = collection.query(
        query_texts=[question],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"]
    )

    chunks = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []

    # Build source references
    sources = [
        f"{m['filename']} (chunk {m['chunk_index']})"
        for m in metadatas
    ]

    return chunks, sources


def list_all_documents() -> list[dict]:
    """List all unique documents stored in ChromaDB."""
    collection = get_collection()
    results = collection.get(include=["metadatas"])

    # Deduplicate by doc_id
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
    """Delete all chunks belonging to a document."""
    collection = get_collection()

    results = collection.get(
        where={"doc_id": document_id},
        include=["metadatas"]
    )

    if not results["ids"]:
        return False

    collection.delete(ids=results["ids"])
    return True