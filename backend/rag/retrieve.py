from qdrant_client.models import Filter, FieldCondition, MatchValue, PointIdsList
from rag.embed import get_embedding, get_qdrant_client, ensure_collection, with_qdrant_retry, COLLECTION_NAME
from datetime import datetime, timedelta


def retrieve_chunks(
    question: str,
    session_id: str,
    document_id: str | None = None,
    top_k: int = 3
) -> tuple[list[str], list[str]]:
    ensure_collection()
    client = get_qdrant_client()

    # Build filter
    conditions = [FieldCondition(key="session_id", match=MatchValue(value=session_id))]
    if document_id:
        conditions.append(FieldCondition(key="doc_id", match=MatchValue(value=document_id)))

    query_filter = Filter(must=conditions)

    # Get embedding for the question
    embeddings = get_embedding([question])
    query_vector = embeddings[0]

    # FIX: client.search is removed in qdrant-client >= 1.16.0
    # Use client.query_points instead
    results = with_qdrant_retry(
        client.query_points,
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=top_k,
        with_payload=True
    ).points

    chunks = [r.payload["text"] for r in results]
    sources = [f"{r.payload['filename']} (chunk {r.payload['chunk_index']})" for r in results]

    return chunks, sources


def list_all_documents(session_id: str) -> list[dict]:
    """List only documents belonging to this session."""
    client = get_qdrant_client()

    query_filter = Filter(
        must=[FieldCondition(key="session_id", match=MatchValue(value=session_id))]
    )

    results = with_qdrant_retry(
        client.scroll,
        collection_name=COLLECTION_NAME,
        scroll_filter=query_filter,
        limit=1000,
        with_payload=True
    )[0]

    seen = {}
    for point in results:
        doc_id = point.payload["doc_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "document_id": doc_id,
                "filename": point.payload["filename"]
            }

    return list(seen.values())


def delete_document_chunks(document_id: str, session_id: str) -> bool:
    """Delete chunks only if they belong to this session."""
    client = get_qdrant_client()

    query_filter = Filter(
        must=[
            FieldCondition(key="doc_id", match=MatchValue(value=document_id)),
            FieldCondition(key="session_id", match=MatchValue(value=session_id)),
        ]
    )

    results = with_qdrant_retry(
        client.scroll,
        collection_name=COLLECTION_NAME,
        scroll_filter=query_filter,
        limit=1000,
        with_payload=False
    )[0]

    if not results:
        return False

    ids = [point.id for point in results]
    
    # FIX: points_selector must be a PointIdsList object, not a raw list
    with_qdrant_retry(
        client.delete, 
        collection_name=COLLECTION_NAME, 
        points_selector=PointIdsList(points=ids)
    )
    return True


def cleanup_old_sessions(max_age_hours: int = 24):
    """Delete all chunks from sessions older than max_age_hours."""
    client = get_qdrant_client()
    cutoff = (datetime.utcnow() - timedelta(hours=max_age_hours)).isoformat()

    results = with_qdrant_retry(
        client.scroll,
        collection_name=COLLECTION_NAME,
        limit=10000,
        with_payload=True
    )[0]

    old_ids = [
        point.id for point in results
        if point.payload.get("created_at", "9999") < cutoff
    ]

    if old_ids:
        # FIX: points_selector must be a PointIdsList object
        with_qdrant_retry(
            client.delete, 
            collection_name=COLLECTION_NAME, 
            points_selector=PointIdsList(points=old_ids)
        )
        print(f"[Cleanup] Deleted {len(old_ids)} chunks older than {max_age_hours}h")