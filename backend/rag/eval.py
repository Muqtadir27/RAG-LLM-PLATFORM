from openai import OpenAI
import os, json, re, httpx
from datetime import datetime


def score_answer(question: str, answer: str, context_chunks: list[str]) -> dict:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return {"success": False, "error": "No API key configured"}

    # Only use best chunk to stay within token limits
    context = context_chunks[0] if context_chunks else ""

    eval_prompt = f"""Rate this Q&A pair. Return ONLY valid JSON, nothing else.

CONTEXT: {context}
QUESTION: {question}
ANSWER: {answer}

Return this exact JSON:
{{
  "faithfulness": <0-100>,
  "relevance": <0-100>,
  "hallucination": <0-100>,
  "verdict": "<PASS or FAIL>"
}}

Rules:
- faithfulness: is the answer supported by context?
- relevance: does the answer address the question?
- hallucination: 100 = no invented facts, 0 = completely invented
- verdict: PASS if all three scores >= 70, else FAIL"""

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1/",
        timeout=30.0,
        http_client=httpx.Client(
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
        )
    )

    try:
        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            messages=[{"role": "user", "content": eval_prompt}],
            temperature=0.0,
            max_tokens=150,
        )

        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        scores = json.loads(raw)

        overall = round(
            (scores["faithfulness"] + scores["relevance"] + scores["hallucination"]) / 3, 1
        )

        return {
            "success": True,
            "scores": {
                "faithfulness": {"score": scores["faithfulness"]},
                "relevance": {"score": scores["relevance"]},
                "hallucination": {"score": scores["hallucination"], "detected": scores["hallucination"] < 70},
                "overall_score": overall,
                "verdict": scores["verdict"]
            },
            "timestamp": datetime.utcnow().isoformat(),
            "chunks_evaluated": len(context_chunks)
        }

    except Exception as e:
        return {"success": False, "error": str(e), "timestamp": datetime.utcnow().isoformat()}