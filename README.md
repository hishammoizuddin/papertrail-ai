# PaperTrail AI

A local-first, production-quality document management and AI extraction app. PaperTrail AI streamlines how you interact with your documents by leveraging advanced AI for processing, understanding, and visualizing your data.

## Features

- **Smart Dashboard**: Centralized hub for managing all your uploaded documents.
- **Advanced Document Processing**:
  - Upload PDFs and Images.
  - Automatic text extraction (OCR via Tesseract).
  - Intelligent chunking and embedding.
  - Automatic classification of document types.
- **Interactive Chat (RAG)**: Chat with your documents using Retrieval-Augmented Generation (RAG) with accurate citations.
- **Mind Map**: Visualize connections and relationships between your documents with an interactive graph view.
- **Vector Search**: Semantic search capabilities powered by Pinecone.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLModel (SQLite), Pinecone (Vector DB)
- **AI/ML**: OpenAI API, PyMuPDF, Pytesseract, Pillow
- **Environment**: Python 3.10+

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: TailwindCSS, PostCSS
- **Visualization**: React Force Graph 2d
- **Animations**: Framer Motion
- **HTTP Client**: Axios

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Tesseract OCR installed on your system
- Pinecone API Key
- OpenAI API Key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Open .env and add your OpenAI and Pinecone API keys
   ```

5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. **Upload**: Use the Dashboard to upload your PDF or Image files.
2. **Process**: The system automatically extracts text and generates embeddings.
3. **Analyze**: Use the Mind Map to see document relationships.
4. **Chat**: Ask questions about your documents in the Chat interface to get answers with citations.

## Credits

**Mohammed Hisham Moizuddin** - *Lead Developer & Creator*

