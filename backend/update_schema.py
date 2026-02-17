from sqlalchemy import create_engine, text
from app.config import DATABASE_URL

def update_schema():
    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print("Executing ALTER TABLE statement...")
        connection.execute(text("ALTER TABLE document MODIFY extracted_json LONGTEXT;"))
        connection.commit()
        print("Schema updated successfully!")

if __name__ == "__main__":
    update_schema()
