# TAForEd: Thematic Analysis for Education

TAForEd is a research-grade platform designed to help educators and researchers analyze open-ended student feedback using Machine Learning and Large Language Models. It automates the process of extracting codes, sentiment analysis, and thematic clustering to provide actionable insights.

![AI Pipeline Architecture](docs/ai-pipeline-architecture.svg)
*(Diagram showing the thematic analysis pipeline)*

## Features

- **Automated Coding**: Uses LLMs (GPT-4o-mini) to extract meaningful codes from raw feedback.
- **Sentiment Analysis**: Assigns sentiment scores to each identified code.
- **Thematic Clustering**: Uses Sentence Transformers and K-Means clustering to group similar feedback into themes.
- **Data Visualization**: PCA-based 2D visualization of feedback clusters.
- **Real-time Status**: Background task processing with status updates via Supabase.

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide React, Framer Motion.
- **Backend**: FastAPI (Python), Sentence-Transformers, Scikit-learn, OpenAI API.
- **Database**: Supabase (PostgreSQL + Vector support).

---

## Local Development Setup

Follow these steps to get the application running on your local machine.

### 1. Clone the Repository
```bash
git clone https://github.com/pyEdTools/thematic
cd TAForEd
```

### 2. Frontend Setup (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.env.local` file and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

### 3. Backend Setup (FastAPI)
1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Create a `.env` file in the `backend/` folder:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```
5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

---

## Sample Data
You can find sample student feedback files in the `data/` directory (10, 25, and 40-row variants) to test the upload and analysis features.

## License
MIT
