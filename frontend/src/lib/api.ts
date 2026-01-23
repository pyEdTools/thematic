import axios from 'axios';

// Using 127.0.0.1 is more reliable than 'localhost' in some browsers
const BACKEND_URL = 'http://127.0.0.1:8000';

export const runGuidedAnalysis = async (projectId: string) => {
  const response = await axios.post(`${BACKEND_URL}/run-guided-analysis`, {
    project_id: projectId
  }, {
    timeout: 60000 // 60 second timeout for AI processing
  });
  return response.data;
};

export const runFullPipeline = async (projectId: string, rowIds: string[]) => {
  const response = await axios.post(`${BACKEND_URL}/run-full-pipeline`, {
    project_id: projectId,
    row_ids: rowIds
  });
  return response.data;
};

export const processCoding = async (projectId: string, rowIds: string[]) => {
  const response = await axios.post(`${BACKEND_URL}/process-coding`, {
    project_id: projectId,
    row_ids: rowIds
  });
  return response.data;
};

export const getProjectStatus = async (projectId: string) => {
  const response = await axios.get(`${BACKEND_URL}/project-status/${projectId}`);
  return response.data;
};
