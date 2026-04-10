from openai import OpenAI
import os
import httpx


def get_client():
    return OpenAI(
        api_key=os.getenv("GLM_API_KEY", ""),
        base_url=os.getenv("GLM_API_BASE", "https://api.groq.com/openai/v1/"),
        timeout=60.0,
        http_client=httpx.Client(
            timeout=httpx.Timeout(
                connect=30.0,
                read=60.0,
                write=30.0,
                pool=10.0,
            )
        )
    )


def generate_answer(question: str, context_chunks: list[str]) -> str:
    context = "\n\n---\n\n".join(context_chunks)

    prompt = f"""You are an expert document analysis assistant. You have been given chunks of text extracted from one or more documents. Your job is to answer the user's question accurately and clearly based on the provided content.

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

    try:
        client = get_client()
        response = client.chat.completions.create(
            model=os.getenv("GLM_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise document analysis assistant. You only answer based on provided document content. You are thorough, clear, and always cite your sources within the document."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=2000,
        )
        return response.choices[0].message.content

    except Exception as e:
        error_str = str(e).lower()
        if "timeout" in error_str:
            return "⚠ Request timed out. Please try again in a moment."
        elif "api key" in error_str or "auth" in error_str:
            return "⚠ Invalid API key. Please check your .env file."
        elif "rate limit" in error_str:
            return "⚠ Rate limit reached. Please wait 30 seconds and try again."
        else:
            return f"⚠ Error: {str(e)}"