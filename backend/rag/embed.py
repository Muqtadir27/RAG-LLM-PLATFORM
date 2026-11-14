from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType
import os
import time
import requests
import httpx
from datetime import datetime
import uuid

COLLECTION_NAME = "documents"
VECTOR_SIZE = 768
JINA_API_URL = "https://api.jina.ai/v1/embeddings"


def get_embedding(texts: list[str]) -> list[list[float]]:
    headers = {
        "Authorization": f"Bearer {os.getenv('JINA_API_KEY')}",
        "Content-Type": "application/json"
    }
    response = requests.post(
        JINA_API_URL,
        headers=headers,
        json={
            "input": texts,
            "model": "jina-embeddings-v2-base-en"
        }
    )
    response.raise_for_status()
    return [item["embedding"] for item in response.json()["data"]]


def get_fresh_qdrant_client() -> QdrantClient:
    """
    Creates a completely fresh QdrantClient with a new connection.
    This eliminates the possibility of using a stale keep-alive connection
    that the server has already closed.
    """
    return QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
        timeout=60.0,
        prefer_grpc=False,
        # Force a new connection for every operation
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=0, keepalive_expiry=0)
    )


def with_qdrant_retry(fn, *args, retries: int = 3, delay: float = 2.0, **kwargs):
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            # We pass the function and arguments. The function itself
            # must create its own fresh client.
            return fn(*args, **kwargs)
        except Exception as e:
            last_error = e
            is_last = attempt == retries
            print(f"[Qdrant] Attempt {attempt}/{retries} failed: {e}" + (" — retrying..." if not is_last else ""))
            if not is_last:
                time.sleep(delay * attempt)
    raise last_error


def ensure_collection():
    # Create a fresh client just for this check
    client = get_fresh_qdrant_client()
    try:
        existing = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in existing:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="session_id",
                field_schema=PayloadSchemaType.KEYWORD
            )
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="doc_id",
                field_schema=PayloadSchemaType.KEYWORD
            )
            print(f"[Qdrant] Created collection and indexes: {COLLECTION_NAME}")
    finally:
        client.close() # Important: close the connection immediately


def embed_and_store(chunks: list[str], doc_id: str, filename: str, session_id: str):
    # 1. Generate embeddings (takes time, connection would go stale)
    embeddings = get_embedding(chunks)

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embeddings[i],
            payload={
                "doc_id": doc_id,
                "filename": filename,
                "chunk_index": i,
                "session_id": session_id,
                "text": chunks[i],
                "created_at": datetime.utcnow().isoformat()
            }
        )
        for i in range(len(chunks))
    ]

    # 2. Create a FRESH client right before writing
    client = get_fresh_qdrant_client()
    try:
        client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"[Qdrant] Stored {len(chunks)} chunks for: {filename} (session: {session_id[:8]}...)")
    finally:
        client.close()