import os
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from parsers import extract_text_from_file
from gemini_client import analyze_text_for_pii, explain_detection

load_dotenv()

class AnalyzeRequest(BaseModel):
    text: str

class ExplainRequest(BaseModel):
    selectedText: str
    context: str

app = FastAPI(title="TrustLens API")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "document.txt"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT.")
    
    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store file: {str(e)}")
        
    extracted_text = extract_text_from_file(file_path, filename)
    
    return {
        "fileId": file_id,
        "filename": filename,
        "contentType": file.content_type,
        "text": extracted_text,
        "status": "uploaded"
    }

@app.post("/api/analyze")
async def analyze_document(req: AnalyzeRequest):
    if not req.text.strip():
        return {
            "privacyScore": 100,
            "detections": []
        }
    return analyze_text_for_pii(req.text)

@app.post("/api/explain")
async def explain_pii(req: ExplainRequest):
    if not req.selectedText.strip():
        raise HTTPException(status_code=400, detail="Selected text cannot be empty.")
    return explain_detection(req.selectedText, req.context)
