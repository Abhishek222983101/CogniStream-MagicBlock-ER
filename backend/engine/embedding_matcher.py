"""
Embedding Matcher - Semantic similarity using PubMedBERT.
Uses pritamdeka/S-PubMedBert-MS-MARCO for medical text embeddings.
Computes cosine similarity between patient profile and trial criteria.
"""

import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)


class EmbeddingMatcher:
    """Semantic similarity matching using PubMedBERT sentence embeddings."""

    def __init__(self):
        self.model = None
        self._loaded = False

    def load(self):
        """Load the sentence transformer model."""
        if self._loaded:
            return

        try:
            from sentence_transformers import SentenceTransformer

            logger.info("Loading PubMedBERT embedding model...")
            self.model = SentenceTransformer(
                "pritamdeka/S-PubMedBert-MS-MARCO",
                device="cpu",  # Keep on CPU to save GPU for LLM
            )
            logger.info("PubMedBERT loaded successfully.")
            self._loaded = True
        except Exception as e:
            logger.error(f"Failed to load PubMedBERT: {e}")
            self.model = None
            self._loaded = True  # Mark as attempted

    @property
    def is_loaded(self) -> bool:
        return self._loaded and self.model is not None

    def encode(self, texts: list[str]) -> Optional[np.ndarray]:
        """Encode a list of texts into embeddings."""
        if not self.is_loaded:
            return None
        try:
            return self.model.encode(
                texts, convert_to_numpy=True, show_progress_bar=False
            )
        except Exception as e:
            logger.error(f"Encoding failed: {e}")
            return None

    def cosine_similarity(self, vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        dot = np.dot(vec_a, vec_b)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))

    def match_criterion(self, patient_text: str, criterion_text: str) -> float:
        """
        Compute semantic similarity between patient text and a criterion.
        Returns a score from 0.0 to 1.0.
        """
        if not self.is_loaded:
            return 0.5  # Neutral if model not loaded

        embeddings = self.encode([patient_text, criterion_text])
        if embeddings is None:
            return 0.5

        return self.cosine_similarity(embeddings[0], embeddings[1])

    def match_trial(self, patient_text: str, trial_criteria_text: str) -> float:
        """
        Compute overall semantic similarity between patient and trial criteria.
        Returns a score from 0.0 to 1.0.
        """
        if not self.is_loaded or not trial_criteria_text.strip():
            return 0.5

        embeddings = self.encode([patient_text, trial_criteria_text])
        if embeddings is None:
            return 0.5

        return self.cosine_similarity(embeddings[0], embeddings[1])

    def batch_match_criteria(
        self, patient_text: str, criteria_texts: list[str]
    ) -> list[float]:
        """
        Match patient against multiple criteria at once (efficient batching).
        Returns list of similarity scores (0-1).
        """
        if not self.is_loaded or not criteria_texts:
            return [0.5] * len(criteria_texts)

        all_texts = [patient_text] + criteria_texts
        embeddings = self.encode(all_texts)
        if embeddings is None:
            return [0.5] * len(criteria_texts)

        patient_emb = embeddings[0]
        scores = []
        for i in range(1, len(embeddings)):
            score = self.cosine_similarity(patient_emb, embeddings[i])
            scores.append(score)

        return scores
