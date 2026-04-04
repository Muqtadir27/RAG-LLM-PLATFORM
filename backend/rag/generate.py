from openai import OpenAI
import os


def get_glm_client():
    """GLM-4.7 uses OpenAI-compatible API."""
    return OpenAI(
        api_key=os.getenv("GLM_API_KEY", ""),
        base_url=os.getenv("GLM_API_BASE", "https://open.bigmodel.cn/api/paas/v4/")
    )


def generate_answer(question: str, context_chunks: list[str]) -> str:
    """
    Generate an answer using GLM-4.7-Flash with retrieved context.
    This is the core RAG generation step.
    """
    # Build context from retrieved chunks
    context = "\n\n---\n\n".join(context_chunks)

    prompt = f"""You are a helpful assistant that answers questions based on the provided document context.

CONTEXT FROM DOCUMENTS:
{context}

QUESTION: {question}

INSTRUCTIONS:
- Answer based ONLY on the context provided above
- If the answer is not in the context, say "I couldn't find this information in the uploaded documents"
- Be concise and accurate
- Cite which part of the document your answer comes from

ANSWER:"""

    client = get_glm_client()

    response = client.chat.completions.create(
        model=os.getenv("GLM_MODEL", "glm-4.7-flash"),
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,  # Lower = more factual, less creative
        max_tokens=1000
    )

    return response.choices[0].message.content