# PaperTrail AI by Aisynch Labs

A local-first, production-quality document management and AI extraction app developed by Aisynch Labs. PaperTrail AI streamlines how you interact with your documents by leveraging advanced AI for processing, understanding, and visualizing your data.

## Features

- **Secure Authentication**: Robust user management with Login/Signup, JWT-based sessions, and secure password hashing.
- **Smart Dashboard**: Centralized hub for managing all your uploaded documents.
- **Advanced Document Processing**:
  - **Universal Uploads**: Support for PDFs and Images.
  - **OCR**: Automatic text extraction via Tesseract.
  - **Intelligent Chunking**: Smart segmentation and embedding for better retrieval.
  - **Auto-Classification**: AI-driven categorization of document types (Invoices, Contracts, Receipts, etc.).
  - **Redaction Service**: Automatically identify and redact sensitive information and PII from your uploaded documents before processing.
- **Interactive Chat (RAG)**: Chat with your documents using Retrieval-Augmented Generation (RAG) with accurate citations.
- **Knowledge Map**: Visual graph of entities (Entities, Issuers, Dates) showing connections and relationships.
  - **Dynamic Categorization & Colors**: Dynamically generates graph node colors and filter options based on available entity types automatically extracted from documents.
  - **Filtering**: Filter nodes by type (Person, Organization, Location, Concept).
  - **Conflict Detection**: Identify contradictions and discrepancies within document sets.
  - **Audit Trail**: Trace the origin of every piece of extracted information.
- **Dossier View**: Deep dive into specific entities with aggregated information from across all documents, including deterministic analytics like Top Collaborators, Activity Trends, and Portfolio Breakdown without relying purely on LLMs.
- **The Arena**: AI-driven debates between personas based on document context. Features a streamlined two-column debate layout and an educational setup process to help you configure opposing perspectives to uncover hidden insights or test hypotheses.
- **Smart Actions**: Automatically extracts actionable items (Deadlines, To-Dos) from your documents. Includes bulk management features like clearing all suggested actions.
- **Vector Search**: Semantic search capabilities powered by Pinecone.
- **Modern UI**: Sleek glassmorphism design with Dark Mode support, smooth animations, and a polished branded experience.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLModel (MySQL), Pinecone (Vector DB). Supports local MySQL as well as managed cloud instances like Aiven MySQL.
- **Authentication**: OAuth2 with Password (Bearer), Passlib (Bcrypt), Python-Jose (JWT)
- **AI/ML**: OpenAI API, PyMuPDF, Pytesseract, Pillow
- **Environment**: Python 3.10+

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: TailwindCSS, PostCSS
- **Routing**: React Router v7
- **Visualization**: React Force Graph 2d
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- **MySQL (v8.0+)** installed and running locally, OR connection details for a managed remote instance (e.g., Aiven).
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
   - If using **Local MySQL**, ensure it is running:
     ```bash
     brew services start mysql
     ```
   - Log in to MySQL and create the database and user (adjust if using a cloud provider like Aiven):
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
   - Add your API keys and Database config (update the DB connection details to your Aiven host if using a remote database):
     ```env
     OPENAI_API_KEY=your_openai_key
     PINECONE_API_KEY=your_pinecone_key
     PINECONE_INDEX_NAME=papertrailai
     
     # Database Configuration (Local or Remote/Aiven)
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

## Deployment

### GitHub Pages (Frontend or Landing Page)

To deploy the frontend application or a corresponding landing page using GitHub Pages:
1. Ensure your local repository is pushed to GitHub.
2. If deploying a Vite app, configure your `vite.config.ts` with the appropriate `base` URL path corresponding to your GitHub repository name.
3. Build the project using `npm run build`.
4. Navigate to your repository settings on GitHub.
5. Go to **Settings > Pages**, and set the source branch (often `gh-pages` if using a deployment script, or `main`/`dist` folder) to deploy your live site automatically.

## Usage

1. **Sign Up / Login**: Create a new account or log in to access your secure dashboard.
2. **Upload & Redact**: Use the Dashboard to upload your PDF or Image files, taking advantage of automatic redaction for sensitive info.
3. **Process**: The system automatically extracts text, generates embeddings, and identifies entities.
4. **Analyze**: Use the Knowledge Map to see document relationships.
   - Click on nodes to see details.
   - Use dynamic Filters to narrow down the view.
   - Run **Conflict Detection** to find inconsistencies.
5. **Dossier**: Explore comprehensive insights of entities including historical trends and top collaborators.
6. **Chat**: Ask questions about your documents in the Chat interface to get answers with citations.
7. **The Arena**: Set up a debate between AI personas to explore different perspectives on your document data.
8. **Actions**: Review automatically generated action items and deadlines, and manage them with bulk actions.

## Troubleshooting

- **Data too long errors**: Ensure your database tables are using `LONGTEXT` for content fields. The backend schema handles this, but if you're migrating from an older version, you might need to alter the table manually.
- **Connection refused**: Ensure MySQL is running on port 3306 and your `.env` credentials are correct. For Aiven or remote databases, ensure the hostname, port, and any SSL/TLS prerequisites are correct.
- **IntegrationError during Upload**: This usually happens if foreign key constraints are violated during graph construction. Ensure you have a clean database state if this persists or check the console logs for specific node failures.
- **Database Session Errors**: If you encounter `AttributeError: __enter__`, ensure you have pulled the latest code which fixes session handling patterns.

## Credits

**Mohammed Hisham Moizuddin** - *Lead Developer & Creator*
