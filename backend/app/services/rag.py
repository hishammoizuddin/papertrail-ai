
from app.services.embeddings import get_embedding
from app.services.pinecone_store import query_similar_vectors
from sqlmodel import Session
from app.models import Chunk, Document
import openai
from app.config import OPENAI_API_KEY
from typing import List, Dict, Any, Optional

openai.api_key = OPENAI_API_KEY

def retrieve_chunks(session: Session, query: str, top_k: int = 10, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
    embedding = get_embedding(query)
    matches = query_similar_vectors(embedding, top_k=top_k, document_id=document_id)
    chunk_ids = [m["id"] for m in matches]
    
    # Check for valid documents join to avoid "ghost" chunks if SQL wasn't cleaned up or if Pinecone is out of sync
    chunks = session.query(Chunk).join(Document)\
        .filter(Chunk.id.in_(chunk_ids))\
        .filter(Document.status != 'deleted')\
        .all()
    
    chunk_map = {c.id: c for c in chunks}
    results = []
    for m in matches:
        cid = m["id"]
        meta = m.get("metadata", {})
        chunk = chunk_map.get(cid)
        # Use filename from DB if possible to be source-of-truth, else metadata
        if chunk:
            doc_filename = chunk.document.filename if chunk.document else meta.get("filename")
            results.append({
                "chunk_id": cid,
                "document_id": meta.get("document_id"),
                "filename": doc_filename,
                "page": meta.get("page"),
                "chunk_index": meta.get("chunk_index"),
                "text": chunk.text,
            })
    return results

def chat_with_context(query: str, retrieved_chunks: List[Dict[str, Any]], image_url: Optional[str] = None, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    context = "\n\n".join([
        f"[doc:{c['document_id']} page:{c['page']} chunk:{c['chunk_index']}] {c['text']}"
        for c in retrieved_chunks
    ])
    
    citations = [
        {
            "document_id": c["document_id"],
            "filename": c["filename"],
            "page": c["page"],
            "chunk_id": c["chunk_id"]
        }
        for c in retrieved_chunks
    ]

    system_message = {
        "role": "system",
        "content": (
            "You are PaperTrail AI, an intelligent document assistant. "
            "Use the provided context to answer the user's question accurately and concisely. "
            "If the answer is not in the context, state that you don't know based on the documents provided. "
            "Always cite sources using the format [doc:document_id page:page chunk:chunk_index] when referencing specific information. "
            "Respond ONLY in valid JSON format as a single JSON object. The keys should be 'answer' (string) and 'citations' (array of objects if any additional info needed, but mainly use text citations). "
            "Ideally just use the 'answer' key for the main response text."
        )
    }

    messages = [system_message]

    # Add history if available
    if history:
        for msg in history:
            # sanitizing roles just in case
            role = msg.get("role")
            if role in ["user", "assistant"]:
                messages.append({"role": role, "content": msg.get("content", "")})

    # Add current user query with context
    user_content = [
        {"type": "text", "text": f"Context from documents:\n{context}\n\nUser Question: {query}\n\nPlease provide your answer in JSON format."}
    ]

    if image_url:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": image_url}
        })

    messages.append({"role": "user", "content": user_content})

    # Use GPT-4o for better performance
    model = "gpt-4o"

    try:
        resp = openai.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.3 # Lower temperature for more factual answers
        )
        
        # Clean up response if needed
        content = resp.choices[0].message.content
        if not content:
            return {"answer": "Error: Empty response from AI.", "citations": []}

        import json
        try:
            parsed = json.loads(content)
            answer_text = parsed.get("answer", content)
            # We can also parse citations from JSON if the model returns them structured, 
            # but we already have ground-truth citations from retrieval. 
            # We'll just return the answer text and the retrieval citations.
            return {"answer": answer_text, "citations": citations}
        except json.JSONDecodeError:
            # Fallback if model didn't return valid JSON
            return {"answer": content, "citations": citations}
            
    except Exception as e:
        print(f"OpenAI API Error: {e}")
        return {"answer": f"I encountered an error processing your request: {str(e)}", "citations": []}
