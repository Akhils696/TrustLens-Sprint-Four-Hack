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
