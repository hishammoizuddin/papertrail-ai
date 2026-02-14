import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "papertrailai")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../storage/uploads")
DB_PATH = os.path.join(os.path.dirname(__file__), "../papertrail.db")
