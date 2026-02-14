# Minimal seed/test script for PaperTrail AI
import requests
import os

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
SAMPLE_PDF = "sample.pdf"  # Place a sample.pdf in this directory

def upload_and_process():
    with open(SAMPLE_PDF, "rb") as f:
        files = {"file": (SAMPLE_PDF, f, "application/pdf")}
        resp = requests.post(f"{BACKEND_URL}/api/documents", files=files)
        resp.raise_for_status()
        doc = resp.json()
        print("Uploaded:", doc)
        doc_id = doc["id"]
        # Process
        resp2 = requests.post(f"{BACKEND_URL}/api/documents/{doc_id}/process")
        resp2.raise_for_status()
        print("Processed:", resp2.json())

if __name__ == "__main__":
    upload_and_process()
