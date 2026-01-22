import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app

@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "TAForEd ML Backend (Seed-Guided) is running"}

@pytest.mark.asyncio
async def test_get_project_status_invalid_id():
    # Test with a non-existent UUID format
    invalid_id = "00000000-0000-0000-0000-000000000000"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/project-status/{invalid_id}")
    
    # If using real Supabase, it might return an error message or empty status
    assert response.status_code == 200
    data = response.json()
    assert "analysis_status" in data
