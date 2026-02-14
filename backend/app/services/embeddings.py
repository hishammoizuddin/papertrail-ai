
import openai
import os
from typing import List
from app.config import OPENAI_API_KEY

openai.api_key = OPENAI_API_KEY

EMBEDDING_MODEL = "text-embedding-3-small"  # Update if newer stable model is available

def get_embedding(text: str) -> List[float]:
	"""
	Get embedding vector for a text chunk using OpenAI API.
	"""
	resp = openai.embeddings.create(
		input=text,
		model=EMBEDDING_MODEL
	)
	return resp.data[0].embedding
