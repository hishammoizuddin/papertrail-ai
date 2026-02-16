from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse, ChatCitation
from app.services import rag
from typing import List

router = APIRouter()

@router.post("/", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
	try:
		chunks = rag.retrieve_chunks(req.message, top_k=req.top_k or 10, document_id=req.document_id)
		result = rag.chat_with_context(req.message, chunks, image_url=req.image_url)
		citations = [ChatCitation(**c) for c in result["citations"]]
		return ChatResponse(answer=result["answer"], citations=citations)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Chat failed: {e}")
