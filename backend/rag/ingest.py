import PyPDF2
from rag.embed import embed_and_store


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file."""
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks for better retrieval."""
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap  # overlap keeps context between chunks

    return chunks


def ingest_pdf(file_path: str, doc_id: str, filename: str) -> int:
    """
    Full pipeline: PDF → text → chunks → embeddings → ChromaDB
    Returns number of chunks stored.
    """
    # Step 1: Extract text
    text = extract_text_from_pdf(file_path)
    if not text.strip():
        raise ValueError("Could not extract text from PDF. File may be scanned/image-based.")

    # Step 2: Chunk the text
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No text chunks generated from document.")

    # Step 3: Embed and store in ChromaDB
    embed_and_store(chunks, doc_id, filename)

    return len(chunks)