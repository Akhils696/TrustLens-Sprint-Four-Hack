import os
import fitz  # PyMuPDF
from docx import Document
from fastapi import HTTPException

def extract_text_from_file(file_path: str, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".txt":
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, "r", encoding="latin-1") as f:
                    return f.read()
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to read TXT file: {str(e)}")
                
    elif ext == ".docx":
        try:
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs]
            return "\n".join(paragraphs)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Word Document: {str(e)}")
            
    elif ext == ".pdf":
        try:
            doc = fitz.open(file_path)
            text_pages = []
            for page in doc:
                text_pages.append(page.get_text())
            return "\n".join(text_pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF Document: {str(e)}")
            
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format.")
