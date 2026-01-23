from pydantic import BaseModel
from typing import List, Optional

class CodingRequest(BaseModel):
    project_id: str
    row_ids: List[str]

class AnalysisRequest(BaseModel):
    project_id: str
