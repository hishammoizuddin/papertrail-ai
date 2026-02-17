import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path so we can import config if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import DATABASE_URL

def migrate():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Add user_id to Document
        try:
            print("Adding user_id to document table...")
            connection.execute(text("ALTER TABLE document ADD COLUMN user_id VARCHAR(255) NULL"))
            print("Success.")
        except Exception as e:
            print(f"Skipping document table (might already exist): {e}")

        # Add user_id to ActionItem
        try:
            print("Adding user_id to actionitem table...")
            connection.execute(text("ALTER TABLE actionitem ADD COLUMN user_id VARCHAR(255) NULL"))
            print("Success.")
        except Exception as e:
            print(f"Skipping actionitem table: {e}")

        # Add user_id to GraphNode
        try:
            print("Adding user_id to graphnode table...")
            connection.execute(text("ALTER TABLE graphnode ADD COLUMN user_id VARCHAR(255) NULL"))
            print("Success.")
        except Exception as e:
            print(f"Skipping graphnode table: {e}")

        # Create User table will be handled by SQLModel.metadata.create_all() later, 
        # but we need to ensure these columns exist for the FK to work if we enforce it at DB level.
        # For now, we are adding columns to existing tables.
        
        connection.commit()
    
    print("Migration columns added.")

if __name__ == "__main__":
    migrate()
