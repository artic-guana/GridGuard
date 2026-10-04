# backend/app_cors_patch.py
# Patch snippet demonstrating how to attach CORS middleware in app.py

from fastapi import FastAPI
from cors_config import add_cors

app = FastAPI(title="Electricity Theft Detector API")

# Add CORS middleware right after FastAPI instantiation and before any routes
add_cors(app)

@app.get("/health")
def health_check():
    return {"status": "ok"}
