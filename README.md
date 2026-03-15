# PaperTrail AI

A production-quality document intelligence platform developed by Hisham Moizuddin. PaperTrail AI lets you upload, process, and interact with your documents using advanced AI — featuring a Neo4j-powered Knowledge Graph, RAG-based chat, entity dossiers, and an AI debate arena.

## Features

- **Secure Authentication**: JWT-based sessions with bcrypt password hashing (Login / Signup).
- **Smart Dashboard (Inbox)**: Centralized hub for uploading and managing all your documents.
- **Advanced Document Processing**:
  - **Universal Uploads**: PDF and image (PNG/JPG) support.
  - **OCR Fallback**: Automatic text extraction via Tesseract for scanned/image-based PDFs.
  - **Intelligent Chunking**: Smart text segmentation, embedding, and Pinecone upsert for RAG.
  - **LLM Extraction (GPT-4o)**: Auto-classification, entity extraction (people, orgs, locations, custom entities), relationship mapping, deadlines, and priority scoring.
- **Interactive Chat (RAG)**: Chat with your documents — answers are grounded in retrieved chunks with page-level citations.
- **Knowledge Map (Neo4j Graph)**:
  - **Graph DB Backend**: Entities and relationships are stored in **Neo4j AuraDB**. Uses `MERGE` semantics for accurate, deduplicated, cross-document entity resolution.
  - **Rich Visualisation**: Force-directed graph via `react-force-graph-2d` with per-type colour coding, directional arrows, and curved edges.
  - **Filtering & Query Builder**: Filter nodes by type; compose advanced multi-field queries.
  - **Trace Trail / Audit Mode**: Highlight the full connection chain of any selected node.
  - **Pattern Detection**: Scan for suspicious cross-document patterns and flag anomalies.
  - **Dossier View**: Deep-dive into any entity — aggregated stats, linked documents, top collaborators, document type distribution, and associated actions.
- **Timeline**: Chronological view of document events and deadlines.
- **Smart Actions**: Automatically extracts action items (deadlines, to-dos, reviews) from documents, with bulk management.
- **The Arena**: AI debate between two configurable personas grounded in your document context — uncover hidden insights or stress-test hypotheses.
- **Modern UI**: Dark-mode glassmorphism design with Framer Motion animations, Lucide icons, and a polished branded experience.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI (Python 3.10+) |
| Relational DB | MySQL via SQLModel/PyMySQL (Aiven cloud or local) |
| Graph DB | **Neo4j AuraDB** (entities, relationships, Knowledge Map) |
| Vector DB | Pinecone (chunk embeddings for RAG) |
| AI / LLM | OpenAI API (`gpt-4o` for extraction, `gpt-3.5-turbo` for classification) |
| OCR | Tesseract + Pytesseract, Pillow |
| PDF Parsing | PyMuPDF |
| Auth | OAuth2 Bearer + JWT (python-jose), Passlib (bcrypt) |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 (Vite) |
| Styling | TailwindCSS, PostCSS |
| Routing | React Router v7 |
| Graph Visualisation | react-force-graph-2d |
| Animations | Framer Motion |
| Icons | Lucide React |
| HTTP | Axios |

---

## Architecture Overview

```
┌─────────────────────┐     REST API      ┌──────────────────────────────────┐
│   React Frontend    │ ──────────────── ▶│         FastAPI Backend           │
│   (Vite / TSX)      │                   │                                   │
│                     │                   │  ┌─────────────┐  ┌────────────┐ │
│  Pages:             │                   │  │  MySQL      │  │  Neo4j     │ │
│  - Inbox (Dashboard)│                   │  │  (Aiven)    │  │  AuraDB    │ │
│  - Chat             │                   │  │             │  │            │ │
│  - Knowledge Map    │                   │  │  Users      │  │  Entities  │ │
│  - Timeline         │                   │  │  Documents  │  │  Relations │ │
│  - Arena            │                   │  │  Chunks     │  │  Graph     │ │
│                     │                   │  │  Deadlines  │  └────────────┘ │
└─────────────────────┘                   │  │  Actions    │  ┌────────────┐ │
                                          │  └─────────────┘  │  Pinecone  │ │
                                          │                   │  (Vectors) │ │
                                          │                   └────────────┘ │
                                          └──────────────────────────────────┘
```

---

## Project Structure

```
papertrailai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, lifespan (DB + Neo4j bootstrap)
│   │   ├── config.py                # Env var loading (DB, OpenAI, Pinecone, Neo4j)
│   │   ├── db.py                    # SQLModel engine + session
│   │   ├── models.py                # SQLModel table definitions
│   │   ├── schemas.py               # Pydantic request/response schemas
│   │   ├── auth.py                  # JWT auth helpers
│   │   ├── routers/
│   │   │   ├── auth.py              # /api/auth — login, signup
│   │   │   ├── documents.py         # /api/documents — upload, process, delete
│   │   │   ├── graph.py             # /api/graph — Knowledge Map (Neo4j-backed)
│   │   │   ├── chat.py              # /api/chat — RAG Q&A
│   │   │   ├── timeline.py          # /api/timeline — document timeline
│   │   │   ├── actions.py           # /api/actions — smart action items
│   │   │   └── arena.py             # /api/arena — AI debate
│   │   └── services/
│   │       ├── neo4j_graph.py       # Neo4j driver singleton + schema bootstrap
│   │       ├── neo4j_service.py     # Graph business logic (Cypher: upsert/rebuild/dossier)
│   │       ├── graph.py             # Legacy SQL graph builder (fallback)
│   │       ├── extraction.py        # GPT-4o entity/relationship extraction
│   │       ├── rag.py               # RAG pipeline (retrieve chunks + chat)
│   │       ├── embeddings.py        # OpenAI embedding wrapper
│   │       ├── pinecone_store.py    # Pinecone upsert/query/delete
│   │       ├── chunking.py          # Text chunking per page
│   │       ├── pdf.py               # PyMuPDF text + image extraction
│   │       ├── ocr.py               # Tesseract OCR
│   │       ├── agents.py            # Smart action generation
│   │       ├── audit.py             # Audit trail service
│   │       ├── pattern_recognition.py # Cross-document pattern detection
│   │       └── timeline.py          # Timeline aggregation
│   ├── storage/uploads/             # Uploaded document files (local disk)
│   ├── requirements.txt
│   └── .env                         # Environment variables (not committed)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Root app + routing
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── config.ts                # API base URL config
│   │   ├── theme.ts                 # Design tokens
│   │   ├── api/                     # Typed Axios API clients
│   │   │   ├── documents.ts
│   │   │   ├── chat.ts
│   │   │   ├── arena.ts
│   │   │   └── timeline.ts
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # JWT auth state
│   │   │   ├── ThemeContext.tsx     # Dark/light mode
│   │   │   └── ToastContext.tsx     # Toast notifications
│   │   ├── pages/
│   │   │   ├── InboxPage.tsx        # Document dashboard
│   │   │   ├── ChatPage.tsx         # RAG chat interface
│   │   │   ├── DocumentDetailPage.tsx
│   │   │   ├── TimelinePage.tsx
│   │   │   ├── ArenaPage.tsx
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   └── components/
│   │       ├── GraphView.tsx        # Knowledge Map force graph
│   │       ├── GraphControls.tsx    # Search, filters, query builder controls
│   │       ├── GraphHelpModal.tsx
│   │       ├── DossierPanel.tsx     # Entity dossier slide-over
│   │       ├── ActionCenter.tsx     # Smart actions panel
│   │       ├── QueryBuilder.tsx     # Advanced graph query builder
│   │       ├── UploadDropzone.tsx
│   │       ├── DocumentList.tsx
│   │       └── ui/                  # Shared UI primitives (Card, Badge, Button, etc.)
│   ├── package.json
│   └── vite.config.ts
│
├── demo_documents/                  # Sample PDFs for testing
├── scripts/                         # Utility scripts
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.10+
- MySQL 8.0+ (local) **or** a managed instance (e.g. [Aiven](https://aiven.io))
- [Neo4j AuraDB Free](https://neo4j.com/cloud/aura/) account (free, no credit card)
- Pinecone account + index named `papertrailai`
- OpenAI API key
- Tesseract OCR installed (`brew install tesseract` on macOS)

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Configure `.env`

Create `backend/.env`:

```env
# OpenAI
OPENAI_API_KEY=your_openai_key

# Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=papertrailai

# MySQL / Aiven Database
DB_HOST=localhost
DB_USER=papertrail_user
DB_PASSWORD=papertrail_password
DB_NAME=papertrailai
DB_PORT=3306
# DB_SSL_CA=ca.pem   # Uncomment for Aiven SSL

# Neo4j AuraDB
NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

#### MySQL Setup (local)

```sql
CREATE DATABASE papertrailai;
CREATE USER 'papertrail_user'@'localhost' IDENTIFIED BY 'papertrail_password';
GRANT ALL PRIVILEGES ON papertrailai.* TO 'papertrail_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Run the backend

```bash
uvicorn app.main:app --reload
# → http://localhost:8000
# Neo4j schema constraints are created automatically on startup
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Usage

1. **Sign Up / Login** — Create an account or log in.
2. **Upload Documents** — Drop PDFs or images into the Inbox.
3. **Process** — Click Process; the pipeline runs OCR → chunking → embedding → LLM extraction → Neo4j graph upsert automatically.
4. **Knowledge Map** — Open the Knowledge Map to see your entity graph. Click **Rebuild Graph** to sync after bulk uploads. Click any node to see details or open its Dossier.
5. **Chat** — Ask questions about any document (or all documents) in the Chat tab with cited answers.
6. **Timeline** — See a chronological view of document events and deadlines.
7. **Actions** — Review auto-generated action items and deadlines.
8. **Arena** — Configure two AI personas and run a structured debate grounded in your documents.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `LONGTEXT` / data too long errors | Ensure your DB tables use `LONGTEXT` for content fields. The schema handles this on fresh installs. |
| MySQL connection refused | Confirm MySQL is running on port 3306 and `.env` credentials match. For Aiven, check SSL/TLS settings. |
| Neo4j connection error | Verify `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` in `.env`. The URI must start with `neo4j+s://` for AuraDB. |
| Empty Knowledge Map | Upload and process at least one document, then click **Rebuild Graph**. |
| Pinecone 403 errors | Check your Pinecone API key and confirm the index name matches `PINECONE_INDEX_NAME`. |
| OCR not working | Ensure Tesseract is installed and available in your `PATH` (`tesseract --version`). |

---

## Credits

**Mohammed Hisham Moizuddin** - *Lead Developer & Creator*
