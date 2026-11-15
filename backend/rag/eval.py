import json
import re
from datetime import datetime

from rag.llm import LLMError, create_completion, friendly_error, get_client, model_name

MAX_CONTEXT_CHARS = 6000   # keep the judge prompt well inside token limits
PASS_THRESHOLD = 70


def _extract_json(raw: str) -> dict:
    """Pull the first JSON object out of a model reply (tolerates ```json fences and extra prose)."""
    raw = re.sub(r"```(?:json)?", "", raw or "").strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("Judge model did not return JSON")
    return json.loads(match.group(0))


def _clamp(value) -> int:
    return max(0, min(100, int(round(float(value)))))


def score_answer(question: str, answer: str, context_chunks: list[str]) -> dict:
    # Judge against ALL retrieved chunks (the answer was generated from all of them)
    context = "\n\n---\n\n".join(context_chunks)[:MAX_CONTEXT_CHARS]

    eval_prompt = f"""Rate this Q&A pair. Return ONLY valid JSON, nothing else.

CONTEXT: {context}
QUESTION: {question}
ANSWER: {answer}

Return this exact JSON:
{{
  "faithfulness": <0-100>,
  "relevance": <0-100>,
  "hallucination": <0-100>
}}

Rules:
- faithfulness: is the answer supported by the context?
- relevance: does the answer address the question?
- hallucination: 100 = no invented facts, 0 = completely invented"""

    try:
        client = get_client(timeout=45.0)
        response = create_completion(
            client,
            model=model_name(),
            messages=[{"role": "user", "content": eval_prompt}],
            temperature=0.0,
            # gpt-oss models spend part of this budget on hidden reasoning, so 150 left no room for the JSON
            max_tokens=2000,
        )
        raw = response.choices[0].message.content
        if not raw or not raw.strip():
            raise LLMError("The judge model returned an empty response. Please try again.")

        scores = _extract_json(raw)
        faithfulness = _clamp(scores["faithfulness"])
        relevance = _clamp(scores["relevance"])
        hallucination = _clamp(scores["hallucination"])

        overall = round((faithfulness + relevance + hallucination) / 3, 1)

        return {
            "success": True,
            "scores": {
                "faithfulness": {"score": faithfulness},
                "relevance": {"score": relevance},
                "hallucination": {"score": hallucination, "detected": hallucination < PASS_THRESHOLD},
                "overall_score": overall,
                # computed here, so the verdict always matches the numbers
                "verdict": "PASS" if overall >= PASS_THRESHOLD else "FAIL",
            },
            "timestamp": datetime.utcnow().isoformat(),
            "chunks_evaluated": len(context_chunks),
        }

    except Exception as e:
        print(f"[Eval] Scoring failed: {type(e).__name__}: {e}")
        return {"success": False, "error": friendly_error(e), "timestamp": datetime.utcnow().isoformat()}
