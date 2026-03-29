"""
Parse Router - POST /api/parse-criteria
Decomposes raw trial criteria text into structured criterion objects.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ParseRequest(BaseModel):
    inclusion_criteria: Optional[str] = None
    exclusion_criteria: Optional[str] = None
    use_llm: bool = False  # Whether to use LLM for complex parsing


@router.post("/api/parse-criteria")
async def parse_criteria(request: ParseRequest):
    """
    Parse raw inclusion/exclusion criteria text into structured criteria.
    Returns categorized criteria (hard vs semantic) with extracted fields.
    """
    from backend.main import get_criteria_parser

    parser = get_criteria_parser()
    if parser is None:
        raise HTTPException(status_code=503, detail="Criteria parser not available")

    try:
        if request.use_llm:
            inclusion, exclusion = await parser.parse_with_llm(
                request.inclusion_criteria,
                request.exclusion_criteria,
            )
        else:
            inclusion, exclusion = parser.parse_criteria(
                request.inclusion_criteria,
                request.exclusion_criteria,
            )

        return {
            "inclusion_criteria": [c.model_dump() for c in inclusion],
            "exclusion_criteria": [c.model_dump() for c in exclusion],
            "total_inclusion": len(inclusion),
            "total_exclusion": len(exclusion),
            "hard_criteria": sum(
                1 for c in inclusion + exclusion if c.category == "hard"
            ),
            "semantic_criteria": sum(
                1 for c in inclusion + exclusion if c.category == "semantic"
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")
