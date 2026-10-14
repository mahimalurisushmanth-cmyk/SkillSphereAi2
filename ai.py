import os
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, HTTPException
from backend.config import settings
from backend.schemas import AIStudyBuddyRequest, AIStudyBuddyResponse

router = APIRouter(prefix="/api", tags=["ai"])

@router.get("/health")
def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status": "ok",
        "app": "SkillSphere AI",
        "gemini_configured": bool(gemini_key and gemini_key != "MY_GEMINI_API_KEY")
    }

@router.post("/ai", response_model=AIStudyBuddyResponse)
def ai_study_buddy(req: AIStudyBuddyRequest):
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not gemini_key or gemini_key == "MY_GEMINI_API_KEY":
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured on the server. Please set GEMINI_API_KEY in your environment."
        )

    prompt = f"""You are the SkillSphere AI Study Buddy, an expert learning mentor in {req.career or 'AI / ML'}.
The student is at {req.level or 'Beginner'} level with the goal: '{req.goal or 'Build AI skills'}'.
Student question / request:
{req.message}

Provide an encouraging, structured, practical, and highly actionable response with concrete steps, examples, or resource recommendations. Keep formatting clean and readable."""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        req_data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        with urllib.request.urlopen(request, timeout=30) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            candidates = res_body.get("candidates", [])
            if candidates:
                reply_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                return {"reply": reply_text, "gemini_configured": True}
            return {"reply": "I am ready to help, but no response was returned by the AI service.", "gemini_configured": True}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {err_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service connection error: {str(e)}")
