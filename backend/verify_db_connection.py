import os
import sys
from sqlalchemy import create_engine, text
from app.config import DATABASE_URL

def verify_connection():
    print(f"Attempting to connect to: {DATABASE_URL}")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("Connection successful!")
            print(f"Result: {result.fetchone()}")
        return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False

if __name__ == "__main__":
    if verify_connection():
        sys.exit(0)
    else:
        sys.exit(1)
