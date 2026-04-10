import chromadb
from chromadb.utils import embedding_functions
import os
from pathlib import Path


embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)


def get_chroma_client():
    chroma_dir = os.getenv(
        "CHROMA_DIR",
        "C:/Users/DELL/OneDrive/Documents/Rafay/Projects/RAG-v2/backend/database/chroma"
    )
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


def embed_and_store(chunks: list[str], doc_id: str, filename: str):
    collection = get_collection()
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"doc_id": doc_id, "filename": filename, "chunk_index": i}
        for i in range(len(chunks))
    ]
    collection.add(documents=chunks, ids=ids, metadatas=metadatas)
    print(f"[ChromaDB] Stored {len(chunks)} chunks for: {filename}")