from fastapi import APIRouter, UploadFile, File, HTTPException, status, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from app.models import Document, Chunk, Deadline
from app.db import get_session, init_db
from app.schemas import DocumentBase, DocumentSummary
from app.services import pdf, ocr, chunking, embeddings, pinecone_store, extraction, graph
import os
import shutil
import uuid
from datetime import datetime
from sqlmodel import select
from typing import List

router = APIRouter()

UPLOAD_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../storage/uploads'))
MAX_UPLOAD_MB = 100
MAX_CHUNKS = 200

@router.on_event("startup")
def startup():
	init_db()

@router.post("/", response_model=DocumentBase)
def upload_document(file: UploadFile = File(...)):
	print(f"DEBUG: upload_document called. Filename: {file.filename}, Content-Type: {file.content_type}")
	try:
		if file.content_type not in ["application/pdf", "image/png", "image/jpeg"]:
			raise HTTPException(status_code=400, detail="Only PDF, PNG, JPG allowed.")
		if file.size and file.size > MAX_UPLOAD_MB * 1024 * 1024:
			raise HTTPException(status_code=400, detail="File too large.")
		doc_id = str(uuid.uuid4())
		doc_dir = os.path.join(UPLOAD_ROOT, doc_id)
		os.makedirs(doc_dir, exist_ok=True)
		file_path = os.path.join(doc_dir, file.filename)
		with open(file_path, "wb") as f:
			shutil.copyfileobj(file.file, f)
		doc = Document(
			id=doc_id,
			filename=file.filename,
			path=file_path,
			created_at=datetime.utcnow(),
			status="uploaded"
		)
		with get_session() as session:
			session.add(doc)
			session.commit()
			session.refresh(doc)
			from app.schemas import DocumentBase
			return DocumentBase.model_validate(doc.model_dump())
	except Exception as e:
		with open("backend_errors.log", "a") as log:
			log.write(f"Upload error: {str(e)}\n")
			import traceback
			traceback.print_exc(file=log)
		raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

@router.post("/{document_id}/process")
def process_document(document_id: str, background_tasks: BackgroundTasks):
	with get_session() as session:
		doc = session.get(Document, document_id)
		if not doc:
			raise HTTPException(status_code=404, detail="Document not found.")
		
		# Set status to processing immediately
		doc.status = "processing"
		session.add(doc)
		session.commit()
		session.refresh(doc)
		
		# Offload heavy lifting to background
		background_tasks.add_task(_process_document_bg, document_id)
		
		from app.schemas import DocumentBase
		return DocumentBase.model_validate(doc.model_dump())

def _process_document_bg(document_id: str):
	"""
	Background task to process the document:
	- Extract text (PDF/OCR)
	- Chunking
	- Embeddings (Pinecone)
	- Classification
	- Extraction
	- Deadlines & Graph
	"""
	with get_session() as session:
		doc = session.get(Document, document_id)
		if not doc:
			return

		try:
			# Remove old vectors/chunks
			pinecone_store.delete_vectors_by_document(document_id)
			session.query(Chunk).filter(Chunk.document_id == document_id).delete()
			session.query(Deadline).filter(Deadline.document_id == document_id).delete()
			session.commit()

			# Extract text
			if doc.filename.lower().endswith(".pdf"):
				pages = pdf.extract_pdf_text_per_page(doc.path)
				# OCR fallback for empty pages
				for p in pages:
					if not p["text"].strip():
						img = pdf.extract_page_image(doc.path, p["page_number"])
						if img:
							ocr_text = ocr.ocr_image(img)
							if ocr_text:
								p["text"] = ocr_text
			else:
				# For images, treat as single page
				try:
					from PIL import Image
					img = Image.open(doc.path)
					text = ocr.ocr_image(img) or ""
				except ImportError:
					text = ""
				pages = [{"page_number": 1, "text": text, "bbox": None}]

			# Chunking
			chunks = chunking.chunk_text_per_page(pages, doc.id, doc.filename)
			if len(chunks) > MAX_CHUNKS:
				# We can't raise HTTP exception here, just mark as error
				doc.status = "error"
				doc.error_message = "Too many chunks. Document too large."
				session.add(doc)
				session.commit()
				return

			# Embeddings & Pinecone
			vectors = []
			for c in chunks:
				emb = embeddings.get_embedding(c["text"])
				vector_id = f"{doc.id}:{c['page']}:{c['chunk_index']}"
				vectors.append((vector_id, emb, {
					"document_id": doc.id,
					"filename": doc.filename,
					"page": c["page"],
					"chunk_index": c["chunk_index"],
					"text_preview": c["text_preview"]
				}))
				# Save chunk in DB
				chunk_obj = Chunk(
					id=vector_id,
					document_id=doc.id,
					page=c["page"],
					chunk_index=c["chunk_index"],
					text=c["text"],
					created_at=datetime.utcnow()
				)
				session.add(chunk_obj)
			
			pinecone_store.upsert_vectors(vectors)

			# Classification & Extraction
			all_text = "\n".join([p["text"] for p in pages])
			classify = extraction.classify_document(all_text)
			extract = extraction.extract_fields(all_text)
			
			import json
			doc.doc_type = classify.get("doc_type")
			doc.issuer = classify.get("issuer")
			doc.extracted_json = json.dumps(extract) if extract else None
			doc.status = "extracted" if extract else "error"
			doc.error_message = None if extract else "Extraction failed"

			# Deadlines
			if extract and extract.get("deadlines"):
				from datetime import date
				for d in extract["deadlines"]:
					due_date_val = d["due_date"]
					try:
						due_date_obj = date.fromisoformat(due_date_val)
					except Exception:
						due_date_obj = None
					
					if due_date_obj is None:
						continue
						
					deadline = Deadline(
						document_id=doc.id,
						label=d.get("action", "Deadline"),
						due_date=due_date_obj,
						severity=d["severity"],
						action=d.get("action")
					)
					session.add(deadline)

			# Primary due date
			if extract and extract.get("deadlines"):
				due_date_str = extract["deadlines"][0]["due_date"]
				try:
					doc.primary_due_date = date.fromisoformat(due_date_str)
				except Exception:
					doc.primary_due_date = None
			
			session.add(doc)
			session.commit()
			session.refresh(doc)
   
			# Generate smart actions (pending actions)
			try:
				from app.services.agents import generate_actions_for_document
				generate_actions_for_document(session, doc)
			except Exception as e:
				print(f"Action generation warning: {e}")
   
			# Trigger graph rebuild to include new nodes/edges
			try:
				graph.rebuild_graph(session)
			except Exception as e:
				print(f"Graph rebuild warning: {e}")

			print(f"Background processing completed for {document_id}")

		except Exception as e:
			print(f"Error processing document {document_id}: {e}")
			doc.status = "error"
			doc.error_message = str(e)
			session.add(doc)
			session.commit()

@router.get("/", response_model=List[DocumentSummary])
def list_documents():
	with get_session() as session:
		# Defer loading extracted_json for performance if possible, 
		# but for now just filtering via schema is enough to save bandwidth.
		docs = session.exec(select(Document)).all()
		return docs

@router.get("/{document_id}", response_model=DocumentBase)
def get_document(document_id: str):
	with get_session() as session:
		doc = session.get(Document, document_id)
		if not doc:
			raise HTTPException(status_code=404, detail="Document not found.")
		return doc

@router.get("/{document_id}/pdf")
def stream_pdf(document_id: str):
	with get_session() as session:
		doc = session.get(Document, document_id)
		if not doc:
			raise HTTPException(status_code=404, detail="Document not found.")
		if not os.path.exists(doc.path):
			raise HTTPException(status_code=404, detail="File not found.")
		def iterfile():
			with open(doc.path, mode="rb") as file_like:
				yield from file_like
		return StreamingResponse(iterfile(), media_type="application/pdf")
