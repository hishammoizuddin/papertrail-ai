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
DB_SSL_CA = os.getenv("DB_SSL_CA", "")

if DB_SSL_CA:
    # Aiven requires ssl_ca with pymysql for secure connections
    ca_path = os.path.join(os.path.dirname(__file__), "..", DB_SSL_CA)
    # Using ssl_ca requires passing ssl context to SQLAlchemy, with pymysql it's passed via query param ssl_ca
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?ssl_ca={ca_path}"
else:
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

