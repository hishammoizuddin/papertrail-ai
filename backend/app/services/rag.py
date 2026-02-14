
from app.services.embeddings import get_embedding
from app.services.pinecone_store import query_similar_vectors
from app.db import get_session
from app.models import Chunk, Document
import openai
from app.config import OPENAI_API_KEY
from typing import List, Dict, Any, Optional

openai.api_key = OPENAI_API_KEY

def retrieve_chunks(query: str, top_k: int = 10, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
	embedding = get_embedding(query)
	matches = query_similar_vectors(embedding, top_k=top_k, document_id=document_id)
	chunk_ids = [m["id"] for m in matches]
	with get_session() as session:
		chunks = session.query(Chunk).filter(Chunk.id.in_(chunk_ids)).all()
		chunk_map = {c.id: c for c in chunks}
	results = []
	for m in matches:
		cid = m["id"]
		meta = m.get("metadata", {})
		chunk = chunk_map.get(cid)
		if chunk:
			results.append({
				"chunk_id": cid,
				"document_id": meta.get("document_id"),
				"filename": meta.get("filename"),
				"page": meta.get("page"),
				"chunk_index": meta.get("chunk_index"),
				"text": chunk.text,
			})
	return results

def chat_with_context(query: str, retrieved_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
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
	system_prompt = (
		"You are PaperTrail AI. Answer the user's question using only the provided context. "
		"If you don't know, say so. Always cite sources as [doc:document_id page:page chunk:chunk_index]. "
		"Respond ONLY in valid JSON format as a single JSON object. The word 'json' must appear in your response."
	)
	user_prompt = f"Context:\n{context}\n\nQuestion: {query}\nAnswer concisely."
	resp = openai.chat.completions.create(
		model="gpt-3.5-turbo-1106",
		messages=[
			{"role": "system", "content": system_prompt},
			{"role": "user", "content": user_prompt}
		],
		response_format={"type": "json_object"}
	)
	answer = resp.choices[0].message.content
	return {"answer": answer, "citations": citations}
