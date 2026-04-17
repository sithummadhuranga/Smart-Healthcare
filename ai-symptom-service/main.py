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
from typing import List, Optional

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
    "You are an expert medical triage AI assistant working at a telemedicine healthcare platform. "
    "Your role is to carefully analyze patient-reported symptoms and provide thorough, clinically-informed, "
    "educational guidance that helps patients understand their situation and take the right next steps. "
    "Always be detailed, empathetic, and informative. Never diagnose — instead explain what the symptoms "
    "may suggest, which body systems are involved, and why a specific specialist is most relevant. "
    "You must respond ONLY with valid JSON. No explanation, no markdown, no extra text outside the JSON object."
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
    possibleConditions: List[str]
    urgency: str          # 'low' | 'medium' | 'high'
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
    user_message = (
        f"A patient describes the following symptoms: {symptoms_str}.\n\n"
        "Perform a thorough medical triage analysis and respond with ONLY the following JSON structure "
        "— no text before or after it:\n"
        "{\n"
        f'  \"specialty\": \"<pick the single most relevant specialist from this list: {specialties_list}>\",\n'
        '  \"note\": \"<Write 4 to 6 detailed, informative sentences. Describe what the combination of '
        'symptoms could indicate about the affected body systems or organs. Explain the physiological '
        'connection between the symptoms (why they may appear together). Describe what a specialist '
        'from the recommended field would assess. Use plain language a patient can understand. '
        'Do NOT provide a definitive diagnosis.>\",\n'
        '  \"possibleConditions\": [\"<most likely condition 1>\", \"<possible condition 2>\", \"<possible condition 3>\"],\n'
        '  \"urgency\": \"<one of exactly: low, medium, high — rate based on symptom severity and risk>\",\n'
        '  \"urgencyReason\": \"<one clear sentence explaining why this urgency level was assigned>\",\n'
        '  \"recommendations\": [\"<practical self-care or next-step action 1>\", \"<action 2>\", \"<action 3>\", \"<action 4>\"],\n'
        '  \"disclaimer\": \"<2-sentence disclaimer: clearly state this is AI-generated preliminary guidance only, '
        'not a medical diagnosis, and the patient must consult a qualified healthcare professional before '
        'drawing any conclusions or starting any treatment>\",\n'
        "}\n"
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
            note=data.get("note", "Please consult a qualified healthcare professional for a thorough evaluation."),
            possibleConditions=possible[:4],
            urgency=urgency,
            urgencyReason=data.get("urgencyReason", "Please consult a specialist for a proper assessment."),
            recommendations=recommendations[:5],
            disclaimer=data.get(
                "disclaimer",
                "This is AI-generated preliminary guidance only and does not constitute a medical diagnosis. "
                "Please consult a qualified healthcare professional before drawing any conclusions or starting any treatment.",
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
