import PyPDF2
from rag.embed import embed_and_store


def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"\n[PAGE {page_num + 1}]\n{page_text}\n"
    return text


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def ingest_pdf(file_path: str, doc_id: str, filename: str, session_id: str) -> int:
    text = extract_text_from_pdf(file_path)

    if not text.strip():
        raise ValueError(
            "Could not extract text from this PDF. "
            "The file may be scanned or image-based."
        )

    chunks = chunk_text(text)

    if not chunks:
        raise ValueError("No text chunks could be generated from this document.")

    embed_and_store(chunks, doc_id, filename, session_id)

    return len(chunks)