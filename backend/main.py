from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
# Fix for OpenMP conflict that can cause crashes during clustering/PCA
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import json
import pandas as pd
from typing import List, Dict, Optional
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from supabase import create_client, Client
import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from pathlib import Path

# Robust .env loading
base_dir = Path(__file__).resolve().parent
env_path = base_dir / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class CodingRequest(BaseModel):
    project_id: str
    row_ids: List[str]

class AnalysisRequest(BaseModel):
    project_id: str

# Initialize clients
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

print(f"--- DEBUG: Loading Env Vars from {env_path} ---")
print(f"File exists: {env_path.exists()}")
print(f"OPENAI_API_KEY found: {bool(OPENAI_KEY)}")
print(f"SUPABASE_URL found: {bool(SUPABASE_URL)}")
print(f"SUPABASE_SERVICE_ROLE_KEY found: {bool(SUPABASE_KEY)}")
print(f"-------------------------------")

if not OPENAI_KEY:
    raise ValueError(f"OPENAI_API_KEY is missing from {env_path}")
if not SUPABASE_URL:
    raise ValueError(f"SUPABASE_URL is missing from {env_path}")
if not SUPABASE_KEY:
    raise ValueError(f"SUPABASE_SERVICE_ROLE_KEY is missing from {env_path}")

openai_client = OpenAI(api_key=OPENAI_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load Embedding Model (all-MiniLM-L6-v2)
print("Loading Embedding Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model Loaded.")

@app.get("/")
async def root():
    return {"message": "TAForEd ML Backend (Seed-Guided) is running"}

def run_process_coding_task(project_id: str, row_ids: List[str]):
    """Background task for process_coding."""
    try:
        # Update status to processing
        supabase.table("projects").update({"analysis_status": "processing", "analysis_error": None}).eq("id", project_id).execute()

        response = supabase.table("document_rows").select("*").in_("id", row_ids).execute()
        rows = response.data
        if not rows:
            supabase.table("projects").update({"analysis_status": "idle"}).eq("id", project_id).execute()
            return

        all_new_codes = []
        for row in rows:
            try:
                content = str(row.get('content', ''))
                prompt = """
Imagine that you are a researcher in education analyzing open-ended feedback. Your task is to identify and label meaningful segments of the text to categorize and analyze them for thematic analysis. 

These segments will be known as ‘codes’ and codes can vary in size (i.e. phrases, short sentences, words), but usually codes encompass a complete thought. They can take the form of a descriptive label that directly describes or is taken from the content of the text. However, codes may also be more abstract and complex in the form of literacy references or metaphors. Your job will be to identify these differences by adopting a strategy first.

STRATEGY:
Before you label, adopt the strategy of asking yourself:
- What is a student expressing or describing?
- Who is involved in the student’s experience, and what roles do they play?
- When did this experience occur in the learning process?
- Where in the educational context is this taking place?
- What are the stated or underlying reasons behind the student’s experience?
- How is the student navigating or reacting to the situation?

TASK:
Analyze this feedback segment: "{content}"

Identify 1 to 5 distinct codes. For each code, provide a lowercase label and a sentiment score (-1.0 to 1.0).

RULES:
1. Each code should represent a clearly different idea or source of meaning.
2. Be brief and do not paraphrase the same concept multiple ways.
3. Use lowercase for all codes.
4. Return ONLY a JSON object.

JSON FORMAT:
{
  "codes": [
    {"code": "code label", "sentiment": 0.5},
    {"code": "another label", "sentiment": -0.2}
  ]
}

Example #1:
feedback: I struggled to keep up with the lab assignments because instructions were unclear and the teaching assistant wasn’t available when I needed help.
Output: {
  "codes": [
    {"code": "lab assignment confusion", "sentiment": -0.6},
    {"code": "lack of instructional clarity", "sentiment": -0.5},
    {"code": "frustration with support", "sentiment": -0.7},
    {"code": "learning barrier during labs", "sentiment": -0.4},
    {"code": "ta unavailability", "sentiment": -0.8}
  ]
}

Example #2:
feedback: Although I found the lectures engaging and the professor clearly passionate, I often felt lost during homework because the examples given in class didn’t match the assignment difficulty.
Output: {
  "codes": [
    {"code": "engaging lectures", "sentiment": 0.8},
    {"code": "passionate professor", "sentiment": 0.9},
    {"code": "homework confusion", "sentiment": -0.5},
    {"code": "mismatch in difficulty", "sentiment": -0.6},
    {"code": "unsupported learning", "sentiment": -0.4},
    {"code": "post-class struggle", "sentiment": -0.3}
  ]
}

Example #3: 
feedback: The group project was helpful because I finally understood the topic after discussing it with my peers.
Output: {
  "codes": [
    {"code": "group learning", "sentiment": 0.8},
    {"code": "improved understanding", "sentiment": 0.7}
  ]
}

Example #4:
feedback: professor was rude
Output: {
  "codes": [
    {"code": "rude professor", "sentiment": -0.9}
  ]
}
""".replace("{content}", content)

                completion = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={ "type": "json_object" }
                )
                
                res_content = completion.choices[0].message.content
                raw_data = json.loads(res_content)
                extracted_list = raw_data.get('codes', raw_data) if isinstance(raw_data, dict) else raw_data
                
                if not isinstance(extracted_list, list):
                    extracted_list = [extracted_list]

                for item in extracted_list:
                    code_text = item.get('code', '').strip()
                    sentiment = float(item.get('sentiment', 0))
                    if not code_text: continue
                    embedding = model.encode([code_text])[0].tolist()
                    all_new_codes.append({
                        "project_id": project_id,
                        "row_id": row['id'],
                        "code_text": code_text,
                        "sentiment_score": sentiment,
                        "embedding": embedding
                    })
            except Exception as row_err:
                print(f"Error processing row {row.get('id')}: {row_err}")
                continue

        if all_new_codes:
            supabase.table("codes").insert(all_new_codes).execute()

        # Update status to completed
        supabase.table("projects").update({"analysis_status": "completed"}).eq("id", project_id).execute()

    except Exception as e:
        print(f"Background Task Error (process_coding): {e}")
        supabase.table("projects").update({"analysis_status": "error", "analysis_error": str(e)}).eq("id", project_id).execute()

@app.get("/project-status/{project_id}")
async def get_project_status(project_id: str):
    """Check the status of background tasks for a project."""
    try:
        res = supabase.table("projects").select("analysis_status, analysis_error").eq("id", project_id).single().execute()
        return res.data
    except Exception as e:
        return {"analysis_status": "error", "analysis_error": str(e)}

@app.post("/process-coding")
async def process_coding(req: CodingRequest, background_tasks: BackgroundTasks):
    """Extract codes and generate embeddings in background."""
    print(f"Queuing coding task for project: {req.project_id}")
    background_tasks.add_task(run_process_coding_task, req.project_id, req.row_ids)
    return {"status": "processing", "message": "Coding analysis started in background"}

def run_analysis_task(project_id: str):
    """Background task for clustering and PCA."""
    try:
        supabase.table("projects").update({"analysis_status": "processing", "analysis_error": None}).eq("id", project_id).execute()

        # 1. Fetch Codes & Embeddings
        codes_res = supabase.table("codes").select("id, code_text, embedding, manual_theme_id").eq("project_id", project_id).execute()
        
        if not codes_res.data:
            supabase.table("projects").update({"analysis_status": "completed"}).eq("id", project_id).execute()
            return

        valid_codes = []
        parsed_embeddings = []
        for c in codes_res.data:
            emb = c.get('embedding')
            if isinstance(emb, str):
                try: emb = json.loads(emb)
                except: continue
            if emb:
                parsed_embeddings.append(emb)
                valid_codes.append(c)

        if not parsed_embeddings:
            supabase.table("projects").update({"analysis_status": "completed"}).eq("id", project_id).execute()
            return

        code_embeddings = np.array(parsed_embeddings)

        # 2. Fetch User Themes & Seeds
        themes_res = supabase.table("themes").select("*").eq("project_id", project_id).execute()
        user_themes = themes_res.data or []
        
        # 3. Calculate Centroids
        initial_centroids = []
        theme_map = {} 
        for i, theme in enumerate(user_themes):
            seeds = theme.get('seed_words', [])
            if seeds:
                seed_list = [str(s) for s in seeds if s]
                if seed_list:
                    seed_embeddings = model.encode(seed_list)
                    centroid = np.mean(seed_embeddings, axis=0) if seed_embeddings.ndim > 1 else seed_embeddings
                    initial_centroids.append(centroid)
                    theme_map[len(initial_centroids) - 1] = theme['id']

        # 4. Clustering
        n_seeds = len(initial_centroids)
        if n_seeds == 0:
            actual_k = min(3, len(code_embeddings))
            kmeans = KMeans(n_clusters=actual_k, random_state=42, n_init=10)
        else:
            initial_array = np.array(initial_centroids)
            if initial_array.ndim == 1: initial_array = initial_array.reshape(1, -1)
            kmeans = KMeans(n_clusters=n_seeds, init=initial_array, n_init=1, random_state=42)

        clusters = kmeans.fit_predict(code_embeddings)

        # 5. PCA
        pca = PCA(n_components=2)
        reduced_vectors = pca.fit_transform(code_embeddings)

        # 6. Save Results Back to Database
        for i, code in enumerate(valid_codes):
            cluster_id = int(clusters[i])
            supabase.table("codes").update({
                "x": float(reduced_vectors[i][0]),
                "y": float(reduced_vectors[i][1]),
                "cluster_id": cluster_id
            }).eq("id", code['id']).execute()

        supabase.table("projects").update({"analysis_status": "completed"}).eq("id", project_id).execute()

    except Exception as e:
        print(f"Background Task Error (run_analysis): {e}")
        supabase.table("projects").update({"analysis_status": "error", "analysis_error": str(e)}).eq("id", project_id).execute()

def run_full_pipeline_task(project_id: str, row_ids: List[str]):
    """Background task for both process_coding and analysis."""
    try:
        # 1. Process Coding
        run_process_coding_task(project_id, row_ids)
        
        # Check if process_coding succeeded (didn't set status to error)
        res = supabase.table("projects").select("analysis_status").eq("id", project_id).single().execute()
        if res.data and res.data.get("analysis_status") == "error":
            return
            
        # 2. Run Analysis
        run_analysis_task(project_id)
        
    except Exception as e:
        print(f"Background Task Error (full_pipeline): {e}")
        supabase.table("projects").update({"analysis_status": "error", "analysis_error": str(e)}).eq("id", project_id).execute()

@app.post("/run-full-pipeline")
async def run_full_pipeline(req: CodingRequest, background_tasks: BackgroundTasks):
    """Run both LLM extraction and Clustering/PCA in background."""
    print(f"Queuing full pipeline for project: {req.project_id}")
    background_tasks.add_task(run_full_pipeline_task, req.project_id, req.row_ids)
    return {"status": "processing", "message": "Full pipeline started in background"}

@app.post("/run-guided-analysis")
async def run_guided_analysis(req: AnalysisRequest, background_tasks: BackgroundTasks):
    """Perform Clustering and PCA in background."""
    print(f"Queuing analysis task for project: {req.project_id}")
    background_tasks.add_task(run_analysis_task, req.project_id)
    return {"status": "processing", "message": "Analysis started in background"}
