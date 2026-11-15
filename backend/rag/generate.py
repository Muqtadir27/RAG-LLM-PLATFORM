from collections.abc import Iterator

from rag.llm import LLMError, create_completion, friendly_error, get_client, model_name

SYSTEM_PROMPT = (
    "You are a precise document analysis assistant. Answer only from the provided document content. "
    "Format answers in clean Markdown: short paragraphs, bullet or numbered lists, **bold** for key terms."
)
MAX_TOKENS = 4000  # gpt-oss models spend part of this on hidden reasoning


def build_prompt(question: str, context: str) -> str:
    return f"""You are an expert document analysis assistant. You have been given chunks of text extracted from one or more documents. Your job is to answer the user's question accurately and clearly based on the provided content.

DOCUMENT CONTENT:
{context}

USER QUESTION: {question}

RULES:
1. Answer clearly and directly based on the document content above
2. If the answer is in the document, state it confidently with the exact source section
3. If asking about authors or people, look for names near words like "by", "submitted by", "authored by", "prepared by", "written by", or at the top/header of the document
4. If asking about dates, look for any year, month, or date-like patterns
5. If asking to compare documents, address each document separately then compare
6. If asking how many documents exist, count the unique filenames mentioned in the chunks
7. If the information is genuinely not in the provided chunks, say: "This specific detail was not found in the document chunks provided. Try re-uploading the document for better coverage."
8. Never make up information. Only use what is in the document content above.
9. Format your answer clearly. Use numbered lists when listing multiple items.
10. Always end with which section or chunk the information came from.

ANSWER:"""


def _messages(question: str, context_chunks: list[str]) -> list[dict]:
    context = "\n\n---\n\n".join(context_chunks)
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_prompt(question, context)},
    ]


def generate_answer(question: str, context_chunks: list[str]) -> str:
    """Non-streaming answer. Errors come back as a '⚠ ...' string (used by /query and /eval/score)."""
    try:
        client = get_client()
        model = model_name()
        print(f"[AI] Calling Groq ({model})...")
        response = create_completion(
            client,
            model=model,
            messages=_messages(question, context_chunks),
            temperature=0.1,
            max_tokens=MAX_TOKENS,
        )
        answer = response.choices[0].message.content or ""
        print("[AI] Groq responded successfully")
        return answer
    except Exception as e:
        print(f"[AI] Groq failed: {e}")
        return f"⚠ {friendly_error(e)}"


def stream_answer(question: str, context_chunks: list[str]) -> Iterator[str]:
    """Yield answer text as it is generated. Raises LLMError (user-safe message) on failure."""
    try:
        client = get_client()
        model = model_name()
        print(f"[AI] Streaming from Groq ({model})...")
        stream = create_completion(
            client,
            model=model,
            messages=_messages(question, context_chunks),
            temperature=0.1,
            max_tokens=MAX_TOKENS,
            stream=True,
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            text = getattr(chunk.choices[0].delta, "content", None)
            if text:
                yield text
    except LLMError:
        raise
    except Exception as e:
        print(f"[AI] Groq stream failed: {e}")
        raise LLMError(friendly_error(e)) from e
