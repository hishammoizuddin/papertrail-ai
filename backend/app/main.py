from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents, chat, timeline, graph, actions, auth, arena
from app.db import init_db
from contextlib import asynccontextmanager
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Bootstrap Neo4j schema (constraints + indexes)
    try:
        from app.services.neo4j_graph import bootstrap_schema
        bootstrap_schema()
    except Exception as e:
        print(f"⚠️  Neo4j bootstrap warning: {e}")
    yield

    # Gracefully close the Neo4j driver on shutdown
    try:
        from app.services.neo4j_graph import close_driver
        close_driver()
    except Exception:
        pass

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["timeline"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(actions.router, prefix="/api/actions", tags=["actions"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(arena.router, prefix="/api/arena", tags=["arena"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
