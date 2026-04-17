"""
AI Symptom Checker Service — Full Implementation
Port: 8000 (FastAPI)
Uses: Google Gemini 1.5 Flash (Primary Engine)
"""

import json
import logging
import os
import re
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
        "GEMINI_API_KEY is not set. " "Add GEMINI_API_KEY=your_key_here to your .env file."
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
    "You are a medical triage assistant for a telemedicine platform. "
    "Provide clinically informed educational guidance in plain language. "
    "Do not diagnose. Explain likely body systems involved, why symptoms may be related, "
    "and which specialist is most suitable. Respond with valid JSON only."
)

SPECIALTIES = [
    "Cardiology",
    "Dermatology",
    "General Practice",
    "Neurology",
    "Orthopedics",
    "Gastroenterology",
    "Pulmonology",
    "ENT",
    "Psychiatry",
    "Ophthalmology",
    "Gynecology",
    "Urology",
    "Endocrinology",
    "Pediatrics",
    "Oncology",
]

PROMPT_TEMPLATE = (
    "Symptoms: {symptoms}\n\n"
    "Return JSON only with this shape:\n"
    "{{\n"
    '  "specialty": "one item from: {specialties}",\n'
    '  "note": "3-4 plain-language sentences. Explain likely body systems, '
    'symptom links, and what the specialist would assess. No diagnosis.",\n'
    '  "possibleConditions": ["2-3 reasonable, non-diagnostic possibilities"],\n'
    '  "urgency": "low|medium|high",\n'
    '  "urgencyReason": "one sentence",\n'
    '  "recommendations": ["3-4 practical next steps or self-care actions"],\n'
    '  "disclaimer": "two short sentences saying this is AI guidance only, '
    'not a diagnosis, and a clinician must be consulted before treatment"\n'
    "}}\n\n"
    "Rules:\n"
    "- Pick exactly one specialty from the allowed list.\n"
    "- Keep the note accurate, calm, and concise.\n"
    "- Avoid markdown and any text outside the JSON object."
)

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
    possibleConditions: List[str]
    urgency: str  # 'low' | 'medium' | 'high'
    urgencyReason: str
    recommendations: List[str]
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
    specialties_list = ", ".join(SPECIALTIES)
    user_message = PROMPT_TEMPLATE.format(
        symptoms=symptoms_str,
        specialties=specialties_list,
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

        urgency = str(data.get("urgency", "medium")).lower()
        if urgency not in ("low", "medium", "high"):
            urgency = "medium"

        possible = data.get("possibleConditions", [])
        if not isinstance(possible, list):
            possible = []

        recommendations = data.get("recommendations", [])
        if not isinstance(recommendations, list):
            recommendations = []

        return SymptomResponse(
            specialty=specialty,
            note=data.get(
                "note",
                "Please consult a qualified healthcare professional for a thorough evaluation.",
            ),
            possibleConditions=possible[:4],
            urgency=urgency,
            urgencyReason=data.get(
                "urgencyReason",
                "Please consult a specialist for a proper assessment.",
            ),
            recommendations=recommendations[:5],
            disclaimer=data.get(
                "disclaimer",
                "This is AI-generated preliminary guidance only and does not "
                "constitute a medical diagnosis. Please consult a qualified "
                "healthcare professional before drawing any conclusions or "
                "starting any treatment.",
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
