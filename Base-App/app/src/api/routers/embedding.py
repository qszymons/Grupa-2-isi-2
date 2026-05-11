"""A module containing embedding-related routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.container import Container
from src.infrastructure.services.iembedding import IEmbeddingService
from src.infrastructure.services.embedding import EmbeddingService

router = APIRouter()


class QueryRequest(BaseModel):
    """Request body for embedding a query."""

    text: str
    model_name: str


class CompareRequest(BaseModel):
    """Request body for comparing embedding models."""

    text: str
    model_names: list[str] | None = None


@router.get(
    "/embedding/models",
    response_model=list[dict],
    status_code=200,
)
@inject
async def get_available_models(
    embedding_service: IEmbeddingService = Depends(
        Provide[Container.embedding_service]
    ),
) -> list[dict]:
    """Get all available embedding models with metadata.

    Returns a list of models with dimensions, size, language info,
    and which one is currently active.

    Args:
        embedding_service (IEmbeddingService): The injected embedding service.

    Returns:
        list[dict]: Available models with metadata.
    """
    return embedding_service.get_available_models()


@router.post(
    "/embedding/compare",
    response_model=list[dict],
    status_code=200,
)
@inject
async def compare_models(
    body: CompareRequest,
    embedding_service: IEmbeddingService = Depends(
        Provide[Container.embedding_service]
    ),
) -> list[dict]:
    """Compare embedding models on a sample text.

    Measures encoding time and output dimensions for each model.

    Args:
        body (CompareRequest): The sample text and optional model list.
        embedding_service (IEmbeddingService): The injected embedding service.

    Returns:
        list[dict]: Comparison results per model.
    """
    if not body.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Tekst nie może być pusty",
        )

    if not isinstance(embedding_service, EmbeddingService):
        raise HTTPException(
            status_code=500,
            detail="Porównanie modeli niedostępne",
        )

    return embedding_service.compare_models(body.text, body.model_names)


@router.post(
    "/embedding/query",
    status_code=200,
)
@inject
async def embed_query(
    body: QueryRequest,
    embedding_service: IEmbeddingService = Depends(
        Provide[Container.embedding_service]
    ),
) -> dict:
    """Generate an embedding for a query text.

    Args:
        body (QueryRequest): The query text and model name.
        embedding_service (IEmbeddingService): The injected embedding service.

    Returns:
        dict: The embedding vector and model info.
    """
    if not body.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Tekst zapytania nie może być pusty",
        )

    if not embedding_service.validate_model_name(body.model_name):
        raise HTTPException(
            status_code=400,
            detail=f"Nieznany model: '{body.model_name}'",
        )

    embedding = embedding_service.embed_query(body.text, body.model_name)
    model_info = embedding_service.get_model_info(body.model_name)

    return {
        "embedding": embedding,
        "dimensions": len(embedding),
        "model": model_info["name"],
    }
