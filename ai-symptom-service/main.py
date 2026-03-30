"""
AI Symptom Checker Service — STUB
Port: 8000 (FastAPI)

Member 3 (AI/Backend) will implement the Gemini integration.
This stub passes health checks so docker-compose up succeeds on Day 1.

Full implementation tasks:
    - Connect to Google Gemini API (gemini-1.5-flash model)
    - See api-contracts.md §4.8 for exact prompt structure
    - See FILE_1_PROJECT_KNOWLEDGE.md §6 for detailed requirements
"""

from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()

app = FastAPI(
    title="AI Symptom Checker",
    description=(
        "AI-powered medical triage using Google Gemini. "
        "See /docs for OpenAPI spec."
    ),
    version="1.0.0",
)


class SymptomRequest(BaseModel):
    symptoms: List[str]


class SymptomResponse(BaseModel):
    specialty: str
    note: str
    disclaimer: str


@app.get("/api/ai/health")
async def health():
    return {"status": "ok", "service": "ai-symptom-service"}


@app.post("/api/ai/check", response_model=SymptomResponse)
async def check_symptoms(request: SymptomRequest):
    """
    STUB — Replace with Gemini AI integration (Member 3, Task M3-T1).

    Expected behaviour:
      1. Build prompt from request.symptoms list (see api-contracts.md §4.8)
      2. Call gemini-1.5-flash model via google-generativeai SDK
      3. Parse JSON from model response
      4. Return { specialty, note, disclaimer }
    """
    return SymptomResponse(
        specialty="General Practice",
        note=(
            "STUB RESPONSE — Gemini AI not yet integrated. "
            f"Received symptoms: {', '.join(request.symptoms)}."
        ),
        disclaimer=(
            "This is not a medical diagnosis. "
            "Please consult a qualified healthcare professional."
        ),
    )
