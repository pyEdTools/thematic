# TAForEd: Thematic Analysis for Education

TAForEd is a platform designed to help educators and researchers analyze open-ended student feedback using Machine Learning and Large Language Models. It automates the process of extracting codes, sentiment analysis, and thematic clustering to provide actionable insights into the student experience.

## Features

- **Automated Coding**: Uses LLMs (GPT-4o-mini) to extract meaningful codes from raw feedback.
- **Sentiment Analysis**: Assigns sentiment scores to each identified code.
- **Thematic Clustering**: Uses Sentence Transformers and K-Means clustering to group similar feedback into themes.
- **Data Visualization**: PCA-based 2D visualization of feedback clusters.
- **Real-time Status**: Background task processing with status updates via Supabase.

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide React.
- **Backend**: FastAPI (Python), Sentence-Transformers, Scikit-learn.
- **Database**: Supabase (PostgreSQL + Vector support).
- **AI**: OpenAI API (GPT-4o-mini).

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.9+)
- Supabase Account
- OpenAI API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pyEdTools/thematic
   cd TAForEd
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local  # Update with your Supabase credentials
   npm run dev
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

## License

MIT
