from qdrant_client.models import Filter, FieldCondition, MatchValue, PointIdsList, FilterSelector
from rag.embed import get_embedding, ensure_collection, with_qdrant, COLLECTION_NAME
from datetime import datetime, timedelta

SCROLL_PAGE = 256


def _scroll_all(client, scroll_filter=None, payload=True):
    """Yield every matching point, following Qdrant's scroll offset."""
    offset = None
    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=scroll_filter,
            limit=SCROLL_PAGE,
            offset=offset,
            with_payload=payload,
            with_vectors=False,
        )
        yield from points
        if offset is None:
            break


def retrieve_chunks(
    question: str,
    session_id: str,
    document_id: str | None = None,
    top_k: int = 3
) -> tuple[list[str], list[str]]:
    ensure_collection()

    conditions = [FieldCondition(key="session_id", match=MatchValue(value=session_id))]
    if document_id:
        conditions.append(FieldCondition(key="doc_id", match=MatchValue(value=document_id)))
    query_filter = Filter(must=conditions)

    # Embed first (slow) so no DB connection is open while we wait
    query_vector = get_embedding([question])[0]

    results = with_qdrant(
        lambda c: c.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k,
            with_payload=True,
        ).points
    )

    chunks = [r.payload["text"] for r in results]
    sources = [f"{r.payload['filename']} (chunk {r.payload['chunk_index']})" for r in results]
    return chunks, sources


def list_all_documents(session_id: str) -> list[dict]:
    """List only documents belonging to this session."""
    ensure_collection()

    query_filter = Filter(
        must=[FieldCondition(key="session_id", match=MatchValue(value=session_id))]
    )

    def op(client):
        seen = {}
        for point in _scroll_all(client, query_filter, payload=["doc_id", "filename"]):
            doc_id = point.payload["doc_id"]
            if doc_id not in seen:
                seen[doc_id] = {"document_id": doc_id, "filename": point.payload["filename"]}
        return list(seen.values())

    return with_qdrant(op)


def delete_document_chunks(document_id: str, session_id: str) -> bool:
    """Delete chunks only if they belong to this session."""
    ensure_collection()

    query_filter = Filter(
        must=[
            FieldCondition(key="doc_id", match=MatchValue(value=document_id)),
            FieldCondition(key="session_id", match=MatchValue(value=session_id)),
        ]
    )

    def op(client):
        count = client.count(
            collection_name=COLLECTION_NAME, count_filter=query_filter, exact=True
        ).count
        if count == 0:
            return False
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(filter=query_filter),
            wait=True,
        )
        return True

    return with_qdrant(op)


def cleanup_old_sessions(max_age_hours: int = 24):
    """Delete all chunks from sessions older than max_age_hours."""
    ensure_collection()
    cutoff = (datetime.utcnow() - timedelta(hours=max_age_hours)).isoformat()

    def op(client):
        old_ids = [
            point.id
            for point in _scroll_all(client, payload=["created_at"])
            if (point.payload or {}).get("created_at", "9999") < cutoff
        ]
        for i in range(0, len(old_ids), 500):
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=PointIdsList(points=old_ids[i:i + 500]),
                wait=True,
            )
        return len(old_ids)

    deleted = with_qdrant(op)
    if deleted:
        print(f"[Cleanup] Deleted {deleted} chunks older than {max_age_hours}h")
