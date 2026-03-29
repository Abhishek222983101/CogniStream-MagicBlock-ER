"""
LLM Matcher - Fine-tuned Mistral-7B + LoRA inference for eligibility assessment.
Hybrid architecture: tries local model first, falls back to Mistral API.

Local model: Mistral-7B-Instruct-v0.3 + trialmatch-7b-lora adapter
API fallback: Mistral API (mistral-large-latest)
"""

import json
import re
import logging
from typing import Optional

from backend.config import (
    BASE_MODEL_NAME,
    LORA_ADAPTER_PATH,
    LLM_MAX_NEW_TOKENS,
    LLM_TEMPERATURE,
)

logger = logging.getLogger(__name__)


class LLMMatcher:
    """
    Fine-tuned LLM for clinical trial eligibility matching.
    Loads Mistral-7B with QLoRA adapter for local inference.
    Falls back to Mistral API if local model unavailable.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.mistral_client = None
        self._local_loaded = False
        self._load_attempted = False

    def set_mistral_client(self, client):
        """Set the Mistral API client for fallback."""
        self.mistral_client = client

    def load(self):
        """Load the fine-tuned model with LoRA adapter."""
        if self._load_attempted:
            return

        self._load_attempted = True

        try:
            import torch
            from transformers import (
                AutoModelForCausalLM,
                AutoTokenizer,
                BitsAndBytesConfig,
            )
            from peft import PeftModel

            if not torch.cuda.is_available():
                logger.warning(
                    "No GPU available. LLM Matcher will use API fallback only."
                )
                return

            logger.info(f"Loading base model: {BASE_MODEL_NAME}...")

            # 4-bit quantization to fit in 8GB VRAM
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_use_double_quant=True,
            )

            base_model = AutoModelForCausalLM.from_pretrained(
                BASE_MODEL_NAME,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True,
            )

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                BASE_MODEL_NAME,
                trust_remote_code=True,
            )
            self.tokenizer.pad_token = self.tokenizer.eos_token
            self.tokenizer.padding_side = "left"

            # Load LoRA adapter
            adapter_path = str(LORA_ADAPTER_PATH)
            logger.info(f"Loading LoRA adapter from: {adapter_path}")
            self.model = PeftModel.from_pretrained(
                base_model,
                adapter_path,
            )
            self.model.eval()

            self._local_loaded = True
            logger.info("Fine-tuned LLM loaded successfully (local inference ready).")

        except Exception as e:
            logger.error(f"Failed to load local LLM: {e}")
            logger.info("Will use Mistral API fallback for LLM matching.")
            self.model = None
            self.tokenizer = None

    @property
    def is_local_loaded(self) -> bool:
        return self._local_loaded and self.model is not None

    @property
    def is_available(self) -> bool:
        return self.is_local_loaded or self.mistral_client is not None

    async def match_criterion(
        self,
        patient_text: str,
        criterion_text: str,
        criterion_type: str = "inclusion",
    ) -> dict:
        """
        Assess eligibility for a single criterion.
        Returns dict with status, confidence, reasoning.
        """
        if self.is_local_loaded:
            return self._local_inference(patient_text, criterion_text, criterion_type)

        if self.mistral_client:
            return await self.mistral_client.match_criterion(
                patient_text, criterion_text, criterion_type
            )

        return {
            "status": "UNCLEAR",
            "confidence": 0,
            "reasoning": "No LLM available (neither local model nor API)",
        }

    def _local_inference(
        self,
        patient_text: str,
        criterion_text: str,
        criterion_type: str = "inclusion",
    ) -> dict:
        """Run inference using the local fine-tuned model."""
        import torch

        system_msg = (
            "You are TrialMatch, a clinical trial eligibility AI. "
            "Assess patient-criterion pairs and respond with JSON."
        )
        user_msg = (
            f"Patient: {patient_text}\n"
            f"Criterion [{criterion_type.upper()}]: {criterion_text}\n"
            "Assess eligibility (JSON response)."
        )

        # Build chat messages using Mistral's format
        messages = [
            {"role": "user", "content": f"[INST] {system_msg}\n\n{user_msg} [/INST]"},
        ]

        # Tokenize
        input_text = (
            self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            if hasattr(self.tokenizer, "apply_chat_template")
            else f"<s>[INST] {system_msg}\n\n{user_msg} [/INST]"
        )

        inputs = self.tokenizer(
            input_text,
            return_tensors="pt",
            truncation=True,
            max_length=1536,
        ).to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=LLM_MAX_NEW_TOKENS,
                temperature=LLM_TEMPERATURE,
                top_p=0.9,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        # Decode only the generated tokens (not the input)
        generated = outputs[0][inputs["input_ids"].shape[1] :]
        response_text = self.tokenizer.decode(
            generated, skip_special_tokens=True
        ).strip()

        return self._parse_response(response_text)

    def _parse_response(self, response_text: str) -> dict:
        """Parse the model's JSON response into a structured dict."""
        try:
            # Try direct JSON parse
            result = json.loads(response_text)
            return self._normalize_result(result)
        except json.JSONDecodeError:
            pass

        # Try to find JSON object in response
        match = re.search(r"\{[^{}]*\}", response_text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
                return self._normalize_result(result)
            except json.JSONDecodeError:
                pass

        # Fallback: try to interpret text response
        lower = response_text.lower()
        if "eligible" in lower and "ineligible" not in lower:
            status = "ELIGIBLE"
            confidence = 70
        elif "ineligible" in lower or "not eligible" in lower:
            status = "INELIGIBLE"
            confidence = 70
        else:
            status = "UNCLEAR"
            confidence = 30

        return {
            "status": status,
            "confidence": confidence,
            "reasoning": response_text[:200]
            if response_text
            else "No response generated",
        }

    def _normalize_result(self, result: dict) -> dict:
        """Normalize the parsed result to ensure consistent format."""
        status = str(result.get("status", "UNCLEAR")).upper()
        # Normalize status values
        if status in ("ELIGIBLE", "PASS", "YES", "MET"):
            status = "ELIGIBLE"
        elif status in ("INELIGIBLE", "FAIL", "NO", "NOT_MET", "NOT MET"):
            status = "INELIGIBLE"
        else:
            status = "UNCLEAR"

        confidence = result.get("confidence", 50)
        if isinstance(confidence, str):
            try:
                confidence = float(confidence)
            except ValueError:
                confidence = 50

        confidence = max(0, min(100, confidence))

        return {
            "status": status,
            "confidence": confidence,
            "reasoning": str(result.get("reasoning", ""))[:500],
        }

    def unload(self):
        """Free GPU memory by unloading the model."""
        if self.model is not None:
            import torch

            del self.model
            self.model = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            self._local_loaded = False
            logger.info("LLM model unloaded, GPU memory freed.")
