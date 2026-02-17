from fastapi import APIRouter, HTTPException, Depends
from app.schemas import ChatRequest, ChatResponse, ChatCitation
from app.services import rag
from typing import List
from sqlmodel import Session
from app.db import get_session

router = APIRouter()

@router.post("/", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, session: Session = Depends(get_session)):
    try:
        chunks = rag.retrieve_chunks(session, req.message, top_k=req.top_k or 10, document_id=req.document_id)
        result = rag.chat_with_context(req.message, chunks, image_url=req.image_url, history=req.history)
        citations = [ChatCitation(**c) for c in result["citations"]]
        return ChatResponse(answer=result["answer"], citations=citations)
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
