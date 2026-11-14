import os
import time
import uuid
from datetime import datetime

import httpx
import requests
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import ResponseHandlingException, UnexpectedResponse
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType

COLLECTION_NAME = "documents"
VECTOR_SIZE = 768
JINA_API_URL = "https://api.jina.ai/v1/embeddings"

EMBED_BATCH_SIZE = 32     # chunks per Jina request
UPSERT_BATCH_SIZE = 64    # points per Qdrant upsert

_collection_ready = False


class QdrantUnavailable(Exception):
    """Raised when Qdrant cannot be reached after all retries."""


# --------------------------------------------------------------------------
# Embeddings (Jina)
# --------------------------------------------------------------------------

def _embed_batch(texts: list[str], retries: int = 3) -> list[list[float]]:
    headers = {
        "Authorization": f"Bearer {os.getenv('JINA_API_KEY')}",
        "Content-Type": "application/json",
    }
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            response = requests.post(
                JINA_API_URL,
                headers=headers,
                json={"input": texts, "model": "jina-embeddings-v2-base-en"},
                timeout=60,
            )
            # Retry on rate limit / server errors, fail fast on other 4xx
            if response.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"Jina returned {response.status_code}", response=response)
            response.raise_for_status()
            return [item["embedding"] for item in response.json()["data"]]
        except (requests.ConnectionError, requests.Timeout) as e:
            last_error = e
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code not in (429, 500, 502, 503, 504):
                raise
            last_error = e
        print(f"[Jina] Attempt {attempt}/{retries} failed: {last_error}")
        if attempt < retries:
            time.sleep(1.5 * attempt)
    raise last_error


def get_embedding(texts: list[str]) -> list[list[float]]:
    embeddings: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        embeddings.extend(_embed_batch(texts[i:i + EMBED_BATCH_SIZE]))
    return embeddings


# --------------------------------------------------------------------------
# Qdrant connection handling
# --------------------------------------------------------------------------

def _qdrant_url() -> str:
    """Read QDRANT_URL and strip things that commonly break it on hosting dashboards
    (surrounding whitespace/quotes, trailing slash)."""
    url = (os.getenv("QDRANT_URL") or "").strip().strip("'\"").rstrip("/")
    if not url:
        raise RuntimeError("QDRANT_URL is not set")
    return url


def get_fresh_qdrant_client() -> QdrantClient:
    """New client with no keep-alive, so a connection the server already closed is never reused."""
    api_key = (os.getenv("QDRANT_API_KEY") or "").strip().strip("'\"") or None
    return QdrantClient(
        url=_qdrant_url(),
        api_key=api_key,
        timeout=60.0,
        prefer_grpc=False,
        check_compatibility=False,  # skip the extra version-check request on startup
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=0, keepalive_expiry=0),
    )


def _is_transient(e: Exception) -> bool:
    if isinstance(e, (ResponseHandlingException, httpx.TransportError, ConnectionError, TimeoutError)):
        return True
    if isinstance(e, UnexpectedResponse) and e.status_code in (429, 502, 503, 504):
        return True
    return False


def with_qdrant(op, retries: int = 4, base_delay: float = 1.5):
    """
    Run op(client) against Qdrant. A NEW client is created for every attempt and
    closed afterwards, so each retry really gets a new connection.
    Non-transient errors (bad request, auth, ...) are raised immediately.
    Raises QdrantUnavailable if every attempt hits a connection-level failure.
    """
    last_error = None
    for attempt in range(1, retries + 1):
        client = get_fresh_qdrant_client()
        try:
            return op(client)
        except Exception as e:
            if not _is_transient(e):
                raise
            last_error = e
            print(f"[Qdrant] Attempt {attempt}/{retries} failed: {type(e).__name__}: {e}")
        finally:
            try:
                client.close()
            except Exception:
                pass
        if attempt < retries:
            time.sleep(base_delay * attempt)
    raise QdrantUnavailable(str(last_error)) from last_error


def check_qdrant() -> dict:
    """Diagnostic used by GET /health/deps. Never includes secrets."""
    try:
        url = _qdrant_url()
    except RuntimeError as e:
        return {"ok": False, "error_type": "ConfigError", "error": str(e)}

    hint = {
        "scheme": url.split("://")[0] if "://" in url else "(missing)",
        "has_explicit_port": url.rsplit(":", 1)[-1].isdigit(),
        "api_key_set": bool((os.getenv("QDRANT_API_KEY") or "").strip()),
    }
    try:
        names = with_qdrant(lambda c: [col.name for col in c.get_collections().collections], retries=2)
        return {"ok": True, "collections": names, "url_hint": hint}
    except Exception as e:
        cause = e.__cause__ or e
        return {
            "ok": False,
            "error_type": type(cause).__name__,
            "error": str(cause)[:300],
            "url_hint": hint,
        }


def ensure_collection():
    global _collection_ready
    if _collection_ready:
        return

    def op(client: QdrantClient):
        existing = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME in existing:
            return
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="session_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="doc_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        print(f"[Qdrant] Created collection and indexes: {COLLECTION_NAME}")

    with_qdrant(op)
    _collection_ready = True


def embed_and_store(chunks: list[str], doc_id: str, filename: str, session_id: str):
    # Make sure the collection exists before the first write (a fresh cluster has none)
    ensure_collection()

    # Embedding is slow, so do it before touching Qdrant
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
                "created_at": datetime.utcnow().isoformat(),
            },
        )
        for i in range(len(chunks))
    ]

    # Write in small batches so one request never carries a huge body
    for i in range(0, len(points), UPSERT_BATCH_SIZE):
        batch = points[i:i + UPSERT_BATCH_SIZE]
        with_qdrant(lambda c, b=batch: c.upsert(collection_name=COLLECTION_NAME, points=b, wait=True))

    print(f"[Qdrant] Stored {len(chunks)} chunks for: {filename} (session: {session_id[:8]}...)")
