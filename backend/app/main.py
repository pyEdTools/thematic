import logging
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from .models import CodingRequest, AnalysisRequest
from .supabase_client import supabase
from .services.worker import run_process_coding_task, run_analysis_task, run_full_pipeline_task

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "TAForEd ML Backend (Modular) is running"}

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
    logger.info(f"Queuing coding task for project: {req.project_id}")
    background_tasks.add_task(run_process_coding_task, req.project_id, req.row_ids)
    return {"status": "processing", "message": "Coding analysis started in background"}

@app.post("/run-full-pipeline")
async def run_full_pipeline(req: CodingRequest, background_tasks: BackgroundTasks):
    """Run both LLM extraction and Clustering/PCA in background."""
    logger.info(f"Queuing full pipeline for project: {req.project_id}")
    background_tasks.add_task(run_full_pipeline_task, req.project_id, req.row_ids)
    return {"status": "processing", "message": "Full pipeline started in background"}

@app.post("/run-guided-analysis")
async def run_guided_analysis(req: AnalysisRequest, background_tasks: BackgroundTasks):
    """Perform Clustering and PCA in background."""
    logger.info(f"Queuing analysis task for project: {req.project_id}")
    background_tasks.add_task(run_analysis_task, req.project_id)
    return {"status": "processing", "message": "Analysis started in background"}
