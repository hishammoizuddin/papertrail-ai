
import fitz  # PyMuPDF
from typing import List, Dict, Any
import logging

def extract_pdf_text_per_page(pdf_path: str) -> List[Dict[str, Any]]:
	"""
	Extract text from each page of a PDF using PyMuPDF.
	Returns a list of dicts: [{page_number, text, bbox}]
	"""
	doc = fitz.open(pdf_path)
	pages = []
	for i, page in enumerate(doc):
		text = page.get_text("text")
		bbox = page.rect
		pages.append({
			"page_number": i + 1,
			"text": text,
			"bbox": [bbox.x0, bbox.y0, bbox.x1, bbox.y1],
		})
	return pages

def extract_page_image(pdf_path: str, page_number: int) -> Any:
	"""
	Extracts a PIL image of a given page (1-based).
	Returns None if Pillow not installed.
	"""
	try:
		from PIL import Image
		import io
	except ImportError:
		return None
	doc = fitz.open(pdf_path)
	page = doc[page_number - 1]
	pix = page.get_pixmap()
	img_bytes = pix.tobytes("png")
	return Image.open(io.BytesIO(img_bytes))
