from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType
import os
import requests
from datetime import datetime
import uuid

COLLECTION_NAME = "documents"
VECTOR_SIZE = 768  # jina-embeddings-v2-base-en output size
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


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
    )


def ensure_collection():
    client = get_qdrant_client()
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        # Create indexes for filtered search
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


def embed_and_store(chunks: list[str], doc_id: str, filename: str, session_id: str):
    ensure_collection()
    client = get_qdrant_client()

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

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"[Qdrant] Stored {len(chunks)} chunks for: {filename} (session: {session_id[:8]}...)")