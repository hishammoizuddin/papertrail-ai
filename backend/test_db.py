from app.db import init_db, engine
from app.models import *  # ensure models are loaded
import traceback

def test_connection():
    try:
        print("Testing database connection and initializing schema...")
        init_db()
        print("Schema initialization successful!")
        
        # Verify connection by connecting directly
        with engine.connect() as connection:
            print("Successfully connected to the database.")
    except Exception as e:
        print("Error connecting to database or initializing schema:")
        print(traceback.format_exc())

if __name__ == "__main__":
    test_connection()
