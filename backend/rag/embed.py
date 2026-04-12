import chromadb
import chromadb.config
from chromadb.utils.embedding_functions import HuggingFaceEmbeddingFunction
import os
from pathlib import Path
from datetime import datetime

embedding_fn = HuggingFaceEmbeddingFunction(
    api_key=os.getenv("HF_API_KEY"),
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


def get_chroma_client():
    chroma_host = os.getenv("CHROMA_HOST")
    if chroma_host:
        print(f"[ChromaDB] Connecting to remote: {chroma_host}")
        client = chromadb.HttpClient(
            host=chroma_host,
            port=443,
            ssl=True,
            settings=chromadb.config.Settings(
                chroma_api_impl="chromadb.api.fastapi.FastAPI",
                anonymized_telemetry=False
            )
        )
        # Ensure default tenant and database exist
        try:
            client.get_tenant("default_tenant")
        except Exception:
            client.create_tenant("default_tenant")
        try:
            client.get_database("default_database", tenant="default_tenant")
        except Exception:
            client.create_database("default_database", tenant="default_tenant")
        return client
    else:
        chroma_dir = os.getenv("CHROMA_DIR", "/tmp/chroma")
        chroma_path = Path(chroma_dir).resolve()
        chroma_path.mkdir(parents=True, exist_ok=True)
        print(f"[ChromaDB] Saving to: {chroma_path}")
        return chromadb.PersistentClient(path=str(chroma_path))


def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="documents",
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )


def embed_and_store(chunks: list[str], doc_id: str, filename: str, session_id: str):
    collection = get_collection()

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "doc_id": doc_id,
            "filename": filename,
            "chunk_index": i,
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat()
        }
        for i in range(len(chunks))
    ]
    collection.add(documents=chunks, ids=ids, metadatas=metadatas)
    print(f"[ChromaDB] Stored {len(chunks)} chunks for: {filename} (session: {session_id[:8]}...)")