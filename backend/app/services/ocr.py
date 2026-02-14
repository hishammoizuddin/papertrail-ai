
import logging
from typing import Optional

def ocr_image(image) -> Optional[str]:
	"""
	Run OCR on a PIL image using pytesseract. Returns extracted text or None if pytesseract not installed.
	"""
	try:
		import pytesseract
	except ImportError:
		logging.warning("pytesseract not installed; skipping OCR.")
		return None
	try:
		text = pytesseract.image_to_string(image)
		return text
	except Exception as e:
		logging.error(f"OCR failed: {e}")
		return None
