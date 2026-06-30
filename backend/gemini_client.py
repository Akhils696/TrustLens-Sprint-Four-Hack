import os
import json
import google.generativeai as genai
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY environment variable is not set.")
else:
    genai.configure(api_key=api_key)

def get_gemini_client():
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is missing. Please set it in the backend/.env file."
        )
    return genai.GenerativeModel("gemini-2.5-flash")

def analyze_text_for_pii(text: str) -> dict:
    model = get_gemini_client()
    
    prompt = f"""
    You are a strict data privacy auditor. Your task is to analyze the following document text and detect all Personally Identifiable Information (PII).
    
    Detect the following categories of PII:
    - Names (of people)
    - Phone Numbers
    - Emails
    - Addresses (physical addresses)
    - Aadhaar (Indian UID)
    - PAN (Indian Tax ID)
    - Passport details
    - Driving License details
    - Bank Account details (account numbers)
    - IFSC (Indian Bank branch codes)
    - Credit Cards
    - Employee IDs
    - Vehicle Numbers (License plates)
    - IP Addresses
    - Dates of Birth
    
    Calculate a 'privacyScore' between 0 and 100, where 100 means the document contains absolutely zero PII and is fully safe, and 0 means it is saturated with critical PII.
    
    You must output ONLY valid JSON matching the exact schema below. Do not wrap the JSON in ```json markdown or add any extra text or comments outside the JSON block.
    
    JSON Schema:
    {{
      "privacyScore": number,
      "detections": [
        {{
          "id": "det-[unique integer string]",
          "text": "[exact text fragment matched in the document]",
          "type": "[one of the detected PII categories listed above]",
          "confidence": [integer between 0 and 100],
          "reason": "[detailed explanation of why this fragment was flagged]",
          "risk": "[description of leak vulnerability risk]",
          "suggestedRedaction": "[REDACTED_(TYPE)_(INDEX)] e.g. [REDACTED_NAME_1] or [REDACTED_EMAIL_1]"
        }}
      ]
    }}
    
    Document Text to Analyze:
    {text}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API analysis failed: {str(e)}"
        )
