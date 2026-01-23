import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Robust .env loading
base_dir = Path(__file__).resolve().parent.parent
env_path = base_dir / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(f"Supabase credentials missing from {env_path}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
