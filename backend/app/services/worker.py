import json
import numpy as np
import logging
from typing import List
from ..supabase_client import supabase
from .llm import extract_codes
from .ml import model, get_embeddings

logger = logging.getLogger(__name__)

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
                extracted_list = extract_codes(content)

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
                logger.error(f"Error processing row {row.get('id')}: {row_err}")
                continue

        if all_new_codes:
            supabase.table("codes").insert(all_new_codes).execute()

        # Update status to completed
        supabase.table("projects").update({"analysis_status": "completed"}).eq("id", project_id).execute()

    except Exception as e:
        logger.error(f"Background Task Error (process_coding): {e}")
        supabase.table("projects").update({"analysis_status": "error", "analysis_error": str(e)}).eq("id", project_id).execute()

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
        from sklearn.cluster import KMeans
        from sklearn.decomposition import PCA
        
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
        logger.error(f"Background Task Error (run_analysis): {e}")
        supabase.table("projects").update({"analysis_status": "error", "analysis_error": str(e)}).eq("id", project_id).execute()

def run_full_pipeline_task(project_id: str, row_ids: List[str]):
    """Background task for both process_coding and analysis."""
    try:
        # 1. Process Coding
        run_process_coding_task(project_id, row_ids)
        
        # Check if process_coding succeeded
        res = supabase.table("projects").select("analysis_status").eq("id", project_id).single().execute()
        if res.data and res.data.get("analysis_status") == "error":
            return
            
        # 2. Run Analysis
        run_analysis_task(project_id)
        
    except Exception as e:
        logger.error(f"Background Task Error (full_pipeline): {e}")
        supabase.table("projects").update({"analysis_status": "error", "analysis_error": str(e)}).eq("id", project_id).execute()
