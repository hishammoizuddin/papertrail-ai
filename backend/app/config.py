import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "papertrailai")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../storage/uploads")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../storage/uploads")

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "papertrail_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "papertrail_password")
DB_NAME = os.getenv("DB_NAME", "papertrailai")
DB_PORT = os.getenv("DB_PORT", "3306")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

