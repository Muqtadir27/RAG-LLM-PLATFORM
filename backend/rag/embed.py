import chromadb
from chromadb.utils import embedding_functions
import os


CHROMA_DIR = os.getenv("CHROMA_DIR", "backend/database/chroma")

# Use sentence-transformers for free local embeddings
# No API key needed for embeddings
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"  # Fast, good quality, runs on CPU
)


def get_chroma_client():
    """Get persistent ChromaDB client."""
    return chromadb.PersistentClient(path=CHROMA_DIR)


def get_collection():
    """Get or create the main documents collection."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="documents",
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )


def embed_and_store(chunks: list[str], doc_id: str, filename: str):
    """
    Embed text chunks and store in ChromaDB with metadata.
    This is PERSISTENT - survives server restarts (unlike your old version).
    """
    collection = get_collection()

    # Create unique IDs for each chunk
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]

    # Metadata for each chunk
    metadatas = [
        {
            "doc_id": doc_id,
            "filename": filename,
            "chunk_index": i
        }
        for i in range(len(chunks))
    ]

    # Store in ChromaDB (auto-embeds using sentence-transformers)
    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=metadatas
    )