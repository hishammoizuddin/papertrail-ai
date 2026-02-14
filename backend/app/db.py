from sqlmodel import SQLModel, create_engine, Session
from app.config import DB_PATH

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
