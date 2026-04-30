"""
FastAPI backend server
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import engine

from models import (  # noqa: F401
    AccelerometerData,
    Base,
    GraphImage,
    RepDetail,
    Set,
    User,
    Session,
)
from routes import (
    auth,
    sessions,
    serial,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database tables created successfully")
    yield


app = FastAPI(
    title="Fitness Tracker API",
    description="API for fitness tracking and accelerometer data management",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(serial.router, prefix="/api")

static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(static_dir, "assets")),
        name="assets",
    )

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
if os.path.exists(uploads_dir):
    app.mount(
        "/uploads",
        StaticFiles(directory=uploads_dir),
        name="uploads",
    )

if os.path.exists(static_dir):
    API_ROUTE_PREFIXES = ["/api", "/docs", "/openapi.json"]

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve React app for non-API routes."""
        is_api_route = any(
            full_path.startswith(prefix) for prefix in API_ROUTE_PREFIXES
        )

        if is_api_route:
            raise HTTPException(
                status_code=404, detail=f"API route not found: /{full_path}"
            )

        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
