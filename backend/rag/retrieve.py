from rag.embed import get_collection


def retrieve_chunks(
    question: str,
    session_id: str,
    document_id: str | None = None,
    top_k: int = 3
) -> tuple[list[str], list[str]]:
    collection = get_collection()

    total = collection.count()
    if total == 0:
        return [], []

    actual_k = min(top_k, total)

    # Always filter by session_id — this is the isolation layer
    if document_id:
        where = {"$and": [{"session_id": session_id}, {"doc_id": document_id}]}
    else:
        where = {"session_id": session_id}

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


def list_all_documents(session_id: str) -> list[dict]:
    """List only documents belonging to this session."""
    collection = get_collection()

    results = collection.get(
        where={"session_id": session_id},
        include=["metadatas"]
    )

    seen = {}
    for meta in results["metadatas"]:
        doc_id = meta["doc_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "document_id": doc_id,
                "filename": meta["filename"]
            }

    return list(seen.values())


def delete_document_chunks(document_id: str, session_id: str) -> bool:
    """Delete chunks only if they belong to this session."""
    collection = get_collection()

    results = collection.get(
        where={"$and": [{"doc_id": document_id}, {"session_id": session_id}]},
        include=["metadatas"]
    )

    if not results["ids"]:
        return False

    collection.delete(ids=results["ids"])
    return True


def cleanup_old_sessions(max_age_hours: int = 24):
    """
    Delete all chunks from sessions older than max_age_hours.
    Call this periodically — e.g. on app startup or via a cron job.
    """
    from datetime import datetime, timedelta

    collection = get_collection()
    cutoff = (datetime.utcnow() - timedelta(hours=max_age_hours)).isoformat()

    results = collection.get(include=["metadatas"])
    old_ids = [
        results["ids"][i]
        for i, meta in enumerate(results["metadatas"])
        if meta.get("created_at", "9999") < cutoff
    ]

    if old_ids:
        collection.delete(ids=old_ids)
        print(f"[Cleanup] Deleted {len(old_ids)} chunks older than {max_age_hours}h")