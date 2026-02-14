
from typing import List, Dict, Any
import math

def chunk_text_per_page(pages: List[Dict[str, Any]], document_id: str, filename: str, chunk_size: int = 1000, overlap: int = 150) -> List[Dict[str, Any]]:
	"""
	For each page, chunk text into ~chunk_size chars with overlap.
	Returns list of chunks with metadata.
	"""
	all_chunks = []
	for page in pages:
		text = page["text"]
		page_number = page["page_number"]
		start = 0
		chunk_index = 0
		while start < len(text):
			end = min(start + chunk_size, len(text))
			chunk_text = text[start:end]
			all_chunks.append({
				"document_id": document_id,
				"filename": filename,
				"page": page_number,
				"chunk_index": chunk_index,
				"text": chunk_text,
				"text_preview": chunk_text[:120],
			})
			chunk_index += 1
			if end == len(text):
				break
			start = end - overlap
	return all_chunks
