from openai import OpenAI
import os
import httpx


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


def generate_answer(question: str, context_chunks: list[str]) -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return "⚠ No API key configured. Add GROQ_API_KEY to your .env file."

    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    context = "\n\n---\n\n".join(context_chunks)
    prompt = build_prompt(question, context)

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1/",
        timeout=60.0,
        http_client=httpx.Client(
            timeout=httpx.Timeout(connect=15.0, read=60.0, write=15.0, pool=10.0)
        )
    )

    try:
        print(f"[AI] Calling Groq ({model})...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise document analysis assistant. Answer only from the provided document content."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=2000,
        )
        answer = response.choices[0].message.content
        print("[AI] Groq responded successfully")
        return answer

    except Exception as e:
        print(f"[AI] Groq failed: {e}")
        return f"⚠ Groq error: {str(e)}"