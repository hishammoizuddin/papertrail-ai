# PaperTrail AI

A local-first, production-quality document management and AI extraction app. PaperTrail AI streamlines how you interact with your documents by leveraging advanced AI for processing, understanding, and visualizing your data.

## Features

- **Secure Authentication**: Robust user management with Login/Signup, JWT-based sessions, and secure password hashing.
- **Smart Dashboard**: Centralized hub for managing all your uploaded documents.
- **Advanced Document Processing**:
  - Upload PDFs and Images.
  - Automatic text extraction (OCR via Tesseract).
  - Intelligent chunking and embedding.
  - Automatic classification of document types (Invoices, Contracts, etc.).
- **Interactive Chat (RAG)**: Chat with your documents using Retrieval-Augmented Generation (RAG) with accurate citations.
- **Knowledge Map**: Visualize connections and relationships between your documents (Entities, Issuers, Dates) with an interactive graph view. **Now supports multi-tenancy with isolated data for each user.**
- **Smart Actions**: Automatically extracts actionable items (Deadlines, To-Dos) from your documents.
- **Vector Search**: Semantic search capabilities powered by Pinecone.
- **Modern UI**: Sleek glassmorphism design with Dark Mode support and smooth animations.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLModel (MySQL), Pinecone (Vector DB)
- **Authentication**: OAuth2 with Password (Bearer), Passlib (Bcrypt), Python-Jose (JWT)
- **AI/ML**: OpenAI API, PyMuPDF, Pytesseract, Pillow
- **Environment**: Python 3.10+

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: TailwindCSS, PostCSS
- **Routing**: React Router v7
- **Visualization**: React Force Graph 2d
- **Animations**: Framer Motion
- **HTTP Client**: Axios

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- **MySQL (v8.0+)** installed and running
- Tesseract OCR installed on your system
- Pinecone API Key
- OpenAI API Key

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure MySQL Database:**
   - Ensure MySQL is running:
     ```bash
     brew services start mysql
     ```
   - Log in to MySQL and create the database and user:
     ```sql
     CREATE DATABASE papertrailai;
     CREATE USER 'papertrail_user'@'localhost' IDENTIFIED BY 'papertrail_password';
     GRANT ALL PRIVILEGES ON papertrailai.* TO 'papertrail_user'@'localhost';
     FLUSH PRIVILEGES;
     ```

5. **Configure Environment Variables:**
   - Create a `.env` file in the `backend` directory:
     ```bash
     cp .env.example .env
     ```
   - Add your API keys and Database config:
     ```env
     OPENAI_API_KEY=your_openai_key
     PINECONE_API_KEY=your_pinecone_key
     PINECONE_INDEX_NAME=papertrailai
     
     # Database Configuration
     DB_HOST=localhost
     DB_USER=papertrail_user
     DB_PASSWORD=papertrail_password
     DB_NAME=papertrailai
     DB_PORT=3306
     
     # Security
     SECRET_KEY=your_super_secret_key_here
     ```

6. **Run the server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will start at `http://localhost:8000`.

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The frontend will start at `http://localhost:5173`.

## Usage

1. **Sign Up / Login**: Create a new account or log in to access your secure dashboard.
2. **Upload**: Use the Dashboard to upload your PDF or Image files.
3. **Process**: The system automatically extracts text, generates embeddings, and identifies entities.
4. **Analyze**: Use the Knowledge Map to see document relationships.
5. **Chat**: Ask questions about your documents in the Chat interface to get answers with citations.
6. **Actions**: Review automatically generated action items and deadlines.

## Troubleshooting

- **Data too long errors**: Ensure your database tables are using `LONGTEXT` for content fields. The backend should handle this automatically on setup.
- **Connection refused**: Ensure MySQL is running on port 3306 and your `.env` credentials are correct.
- **Database Session Errors**: If you encounter `AttributeError: __enter__`, ensure you have pulled the latest code which fixes session handling patterns.

## Credits

**Mohammed Hisham Moizuddin** - *Lead Developer & Creator*
