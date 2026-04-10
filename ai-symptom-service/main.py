"""
AI Symptom Checker Service — Full Implementation
Port: 8000 (FastAPI)
Uses: Google Gemini 1.5 Flash (Primary Engine)
"""

import json
import logging
import os
import re
import time
from typing import List

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Environment validation ──────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. "
        "Add GEMINI_API_KEY=your_key_here to your .env file."
    )

genai.configure(api_key=GEMINI_API_KEY)

# ── FastAPI app ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Symptom Checker",
    description="AI-powered medical triage using Google Gemini. See /docs for OpenAPI spec.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Gemini configuration ────────────────────────────────────────────────────────
SYSTEM_INSTRUCTION = (
    "You are a medical triage assistant. "
    "You must respond ONLY with valid JSON, no explanation, no markdown, no extra text."
)

SPECIALTIES = [
    "Cardiology", "Dermatology", "General Practice", "Neurology",
    "Orthopedics", "Gastroenterology", "Pulmonology", "ENT",
    "Psychiatry", "Ophthalmology", "Gynecology", "Urology",
    "Endocrinology", "Pediatrics", "Oncology",
]

_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=SYSTEM_INSTRUCTION,
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",
        temperature=0.3,
    ),
)


# ── Pydantic models ─────────────────────────────────────────────────────────────
class SymptomRequest(BaseModel):
    symptoms: List[str]


class SymptomResponse(BaseModel):
    specialty: str
    note: str
    disclaimer: str


# ── Endpoints ───────────────────────────────────────────────────────────────────
@app.get("/api/ai/health")
async def health():
    return {"status": "ok", "service": "ai-symptom-service"}


@app.post("/api/ai/check", response_model=SymptomResponse)
async def check_symptoms(request: SymptomRequest):
    """
    Analyzes patient symptoms using Google Gemini 1.5 Flash.
    Returns: specialty recommendation, preliminary note, and safety disclaimer.
    """
    symptoms_cleaned = [s.strip() for s in request.symptoms if s.strip()]
    if not symptoms_cleaned:
        raise HTTPException(status_code=400, detail="symptoms list cannot be empty")

    symptoms_str = ", ".join(symptoms_cleaned)
    user_message = (
        f"Patient reports these symptoms: {symptoms_str}.\n"
        "Based on these symptoms, respond with exactly this JSON structure:\n"
        '{"specialty":"<most relevant specialty from: '
        f"{', '.join(SPECIALTIES)}"
        '>","note":"<2 sentences of preliminary observation, do not diagnose>'
        '","disclaimer":"<safety disclaimer advising the patient to consult a qualified doctor>"}'
    )

    try:
        logger.info("Analyzing symptoms via Gemini: %s", symptoms_str)
        response = _model.generate_content(user_message)

        try:
            data = json.loads(response.text)
        except (json.JSONDecodeError, ValueError):
            # Fallback: extract first JSON object from response text
            match = re.search(r"\{.*\}", response.text, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                logger.error("Cannot parse Gemini output: %s", response.text)
                raise HTTPException(status_code=500, detail="Failed to parse AI response")

        specialty = data.get("specialty", "General Practice")
        if specialty not in SPECIALTIES:
            specialty = "General Practice"

        return SymptomResponse(
            specialty=specialty,
            note=data.get("note", "Please describe your symptoms in more detail."),
            disclaimer=data.get(
                "disclaimer",
                "This is not a medical diagnosis. Please consult a qualified healthcare professional.",
            ),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Gemini API error: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"AI service temporarily unavailable: {exc}",
        )
