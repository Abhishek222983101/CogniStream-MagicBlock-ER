"""
Mistral API Client - Fallback service for LLM inference via Mistral API.
Used when local model is unavailable or for criteria parsing.
"""

import logging
import json
import httpx
from typing import Optional

from backend.config import MISTRAL_API_KEY, MISTRAL_API_MODEL

logger = logging.getLogger(__name__)


class MistralClient:
    """Async client for Mistral API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or MISTRAL_API_KEY
        self.base_url = "https://api.mistral.ai/v1"
        self.model = MISTRAL_API_MODEL
        self._client = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=60.0,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def chat(
        self,
        user_message: str,
        system_message: str = "You are TrialMatch, a clinical trial eligibility AI. Respond with valid JSON.",
        temperature: float = 0.1,
        max_tokens: int = 1024,
    ) -> str:
        """Send a chat completion request to Mistral API."""
        client = await self._get_client()

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Mistral API error {e.response.status_code}: {e.response.text}"
            )
            raise
        except Exception as e:
            logger.error(f"Mistral API request failed: {e}")
            raise

    async def match_criterion(
        self,
        patient_text: str,
        criterion_text: str,
        criterion_type: str = "inclusion",
    ) -> dict:
        """
        Use Mistral API to assess eligibility for a criterion.
        Returns dict with status, confidence, reasoning.
        """
        prompt = (
            f"Patient: {patient_text}\n"
            f"Criterion [{criterion_type.upper()}]: {criterion_text}\n"
            "Assess eligibility. Respond ONLY with valid JSON:\n"
            '{"status": "ELIGIBLE|INELIGIBLE|UNCLEAR", "confidence": 0-100, "reasoning": "brief explanation"}'
        )

        try:
            response_text = await self.chat(prompt)
            # Try to parse JSON from response
            # Handle cases where response has extra text around JSON
            json_match = None
            for attempt in [response_text.strip()]:
                try:
                    return json.loads(attempt)
                except json.JSONDecodeError:
                    pass

            # Try to find JSON object in response
            import re

            match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if match:
                return json.loads(match.group())

            return {
                "status": "UNCLEAR",
                "confidence": 50,
                "reasoning": "Could not parse API response",
            }
        except Exception as e:
            logger.error(f"Mistral API match failed: {e}")
            return {
                "status": "UNCLEAR",
                "confidence": 0,
                "reasoning": f"API error: {str(e)}",
            }

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
