"""Main module of the app"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers.user import router as user_router
from src.api.routers.project import router as project_router
from src.api.routers.tag import router as tag_router
from src.api.routers.document import router as document_router
from src.container import Container
from src.db import database, init_db

container = Container()
container.wire(modules=[
    "src.api.routers.user",
    "src.api.routers.project",
    "src.api.routers.tag",
    "src.api.routers.document",
    "src.api.utils.dependencies",
    ])


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator:
    """Lifespan function working on app startup."""
    await init_db()
    await database.connect()
    yield
    await database.disconnect()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost", "http://localhost:3000", "http://127.0.0.1", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/api")
app.include_router(project_router, prefix="/api")
app.include_router(tag_router, prefix="/api/tag")
app.include_router(document_router, prefix="/api")


@app.exception_handler(HTTPException)
async def http_exception_handle_logging(
    request: Request,
    exception: HTTPException,
) -> Response:
    """A function handling http exceptions for logging purposes.

    Args:
        request (Request): The incoming HTTP request.
        exception (HTTPException): A related exception.

    Returns:
        Response: The HTTP response.
    """
    return await http_exception_handler(request, exception)