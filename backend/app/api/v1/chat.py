from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import google.generativeai as genai
from typing import List
import structlog

from backend.app.config import settings

logger = structlog.get_logger()

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("")
async def chat_with_gemini(request: ChatRequest):
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not configured")
        raise HTTPException(status_code=500, detail="Chat functionality is currently unavailable.")

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            'gemini-3.5-flash',
            system_instruction=(
                "You are Disaster.Ai, a helpful and empathetic assistant for the Resque.Ai disaster management platform. "
                "Provide concise, actionable advice for disaster preparedness, response, and recovery."
            )
        )
        
        contents = []
        for msg in request.messages:
            role = "model" if msg.role == "assistant" else "user"
            contents.append({"role": role, "parts": [msg.content]})
            
        if not contents:
            raise HTTPException(status_code=400, detail="Messages cannot be empty.")
            
        response = model.generate_content(contents)
        
        return {"role": "assistant", "content": response.text}
    except Exception as e:
        logger.error("Gemini API error", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate response. Please try again later.")
