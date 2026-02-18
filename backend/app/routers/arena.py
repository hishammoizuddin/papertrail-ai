from fastapi import APIRouter, HTTPException, Depends
from app.schemas import ArenaStartRequest, ArenaTurnRequest, ArenaResponse, ArenaPersona
from app.services import rag
from sqlmodel import Session
from app.db import get_session
import openai
from app.config import OPENAI_API_KEY
from typing import List, Dict, Any

router = APIRouter()
openai.api_key = OPENAI_API_KEY

@router.post("/start", response_model=Dict[str, Any])
def start_arena(req: ArenaStartRequest, session: Session = Depends(get_session)):
    try:
        # 1. Retrieve Context
        # Using the first document ID or general topic search
        doc_id = req.document_ids[0] if req.document_ids else None
        chunks = rag.retrieve_chunks(session, req.topic, top_k=15, document_id=doc_id)
        
        context_text = "\n".join([f"{c['text']}" for c in chunks])
        if not context_text:
            context_text = "No specific document context found. Debating based on general knowledge."

        # 2. Generate Opening Statement for Persona A
        system_prompt = (
            f"You are {req.persona_a.name}, a {req.persona_a.role}. "
            f"You are starting a debate on the topic: '{req.topic}'. "
            f"Base your arguments on the following context:\n\n{context_text}\n\n"
            "Keep your opening statement concise (under 100 words), provocative, and firmly grounded in the provided text."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Please make your opening statement."}
        ]

        resp = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7
        )
        
        initial_message = resp.choices[0].message.content

        return {
            "session_id": "sim_" + req.topic[:10].replace(" ", "_"), 
            "initial_message": initial_message,
            "context": context_text
        }

    except Exception as e:
        print(f"Arena Start Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start arena: {str(e)}")

@router.post("/turn", response_model=ArenaResponse)
def play_turn(req: ArenaTurnRequest):
    try:
        persona = req.current_speaker
        
        system_prompt = (
            f"You are {persona.name}, a {persona.role}. "
            "You are in a debate. Your goal is to critically analyze the opponent's points and advance your own perspective using the provided context. "
            f"Context:\n{req.context}\n\n"
            "Guidelines:\n"
            "- Be conversational but professional.\n"
            "- Cite specific details from the context where possible.\n"
            "- Keep responses under 150 words.\n"
            "- Do not be agreeable. Find holes in the argument."
        )
        
        # We construct the message history for the model
        # The 'user' role effectively acts as the opponent's last turn
        last_turn_content = "Start the debate."
        if req.history:
            last_turn = req.history[-1]
            # Assuming history is list of dicts with 'content' and potentially 'speaker'
            # We treat the text content as the input
            if isinstance(last_turn, dict):
                 last_turn_content = last_turn.get("content", "")
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Your opponent just said:\n\"{last_turn_content}\"\n\nRespond to this point."}
        ]

        resp = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7
        )
        
        response_text = resp.choices[0].message.content
        
        return ArenaResponse(
            speaker=persona.name,
            message=response_text
        )

    except Exception as e:
        print(f"Arena Turn Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process turn: {str(e)}")
