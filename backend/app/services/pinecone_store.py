# Pinecone vector store logic
# To be implemented

import os
from pinecone import Pinecone
from app.config import PINECONE_API_KEY, PINECONE_INDEX_NAME

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "papertrailai"))

NAMESPACE = "papertrail"

def upsert_vectors(vectors: list):
	"""
	Upsert a list of vectors to Pinecone. Each vector: (id, values, metadata)
	"""
	index.upsert(vectors=vectors, namespace=NAMESPACE)

def delete_vectors(ids: list):
	"""
	Delete vectors by a list of IDs.
	"""
	try:
		# Pinecone delete by IDs
		# Process in batches of 1000 to be safe
		batch_size = 1000
		for i in range(0, len(ids), batch_size):
			batch = ids[i:i+batch_size]
			index.delete(ids=batch, namespace=NAMESPACE)
	except Exception as e:
		print(f"Error deleting vectors by IDs: {e}")

def delete_vectors_by_document(document_id: str):
	"""
	Delete all vectors for a document by filtering metadata.
	"""
	try:
		index.delete(filter={"document_id": document_id}, namespace=NAMESPACE)
	except Exception as e:
		print(f"Error deleting vectors for document {document_id}: {e}")
		# We don't raise here to allow calling logic to try ID-based deletion if needed or proceed


def query_similar_vectors(embedding: list, top_k: int = 10, document_id: str = None):
	"""
	Query Pinecone for similar vectors. Optionally filter by document_id.
	"""
	filter_dict = {"document_id": document_id} if document_id else {}
	res = index.query(vector=embedding, top_k=top_k, filter=filter_dict, namespace=NAMESPACE, include_metadata=True)
	return res.get("matches", [])
# Pinecone vector store logic
# To be implemented
