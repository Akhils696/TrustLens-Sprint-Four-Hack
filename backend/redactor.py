import os
import fitz  # PyMuPDF
from docx import Document
from fastapi import HTTPException

def redact_document(file_path: str, filename: str, redactions: list[str]) -> str:
    ext = os.path.splitext(filename)[1].lower()
    redacted_pdf_path = file_path + ".redacted.pdf"
    
    if ext == ".pdf":
        try:
            doc = fitz.open(file_path)
            for page in doc:
                for text_to_redact in redactions:
                    if not text_to_redact.strip():
                        continue
                    text_instances = page.search_for(text_to_redact)
                    for inst in text_instances:
                        page.add_redact_annotation(inst, fill=(0, 0, 0))
                page.apply_redactions()
            doc.save(redacted_pdf_path)
            doc.close()
            return redacted_pdf_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to redact PDF: {str(e)}")
            
    else:
        try:
            text_content = ""
            if ext == ".txt":
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text_content = f.read()
            elif ext == ".docx":
                doc = Document(file_path)
                text_content = "\n".join([p.text for p in doc.paragraphs])
                
            for text_to_redact in redactions:
                if text_to_redact.strip():
                    text_content = text_content.replace(text_to_redact, "[REDACTED]")
                    
            doc = fitz.open()
            page = doc.new_page()
            rect = fitz.Rect(50, 50, 550, 800)
            page.insert_textbox(rect, text_content)
            doc.save(redacted_pdf_path)
            doc.close()
            return redacted_pdf_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to redact document: {str(e)}")
