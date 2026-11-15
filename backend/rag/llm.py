"""Shared Groq/OpenAI-compatible client helpers used by answer generation and evaluation."""
import os
import httpx
import openai
from openai import OpenAI

DEFAULT_MODEL = "openai/gpt-oss-120b"
GROQ_BASE_URL = "https://api.groq.com/openai/v1/"


class LLMError(Exception):
    """Raised for any LLM failure. The message is safe to show to users."""


def model_name() -> str:
    return os.getenv("GROQ_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def get_client(timeout: float = 60.0) -> OpenAI:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise LLMError("No API key configured. Set GROQ_API_KEY on the backend.")
    return OpenAI(
        api_key=api_key,
        base_url=GROQ_BASE_URL,
        timeout=timeout,
        http_client=httpx.Client(
            timeout=httpx.Timeout(connect=15.0, read=timeout, write=15.0, pool=10.0)
        ),
    )


def create_completion(client: OpenAI, **kwargs):
    """
    chat.completions.create with one tweak: gpt-oss models are reasoning models that spend tokens
    "thinking" before they answer. reasoning_effort=low keeps answers fast. If the API rejects the
    parameter, retry without it so a provider change can never break answering.
    """
    model = kwargs.get("model", "")
    if model.startswith("openai/gpt-oss"):
        try:
            return client.chat.completions.create(**kwargs, extra_body={"reasoning_effort": "low"})
        except openai.BadRequestError as e:
            print(f"[LLM] reasoning_effort rejected, retrying without it: {e}")
    return client.chat.completions.create(**kwargs)


def friendly_error(e: Exception) -> str:
    """Turn provider exceptions into short messages that make sense in the UI."""
    text = str(e)
    if isinstance(e, LLMError):
        return text
    if isinstance(e, openai.NotFoundError) or "model_not_found" in text:
        return "The AI model is unavailable. Check the GROQ_MODEL setting on the backend."
    if isinstance(e, openai.AuthenticationError):
        return "The AI service rejected the API key. Check GROQ_API_KEY on the backend."
    if isinstance(e, openai.RateLimitError):
        return "The AI service is rate limited right now. Please try again in a moment."
    if isinstance(e, (openai.APITimeoutError, openai.APIConnectionError)):
        return "Could not reach the AI service. Please try again."
    return f"The AI service returned an error: {text[:200]}"
