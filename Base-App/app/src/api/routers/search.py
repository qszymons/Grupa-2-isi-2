"""A module containing semantic search routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4

from src.api.utils import get_current_user_uuid
from src.container import Container
from src.core.domain.search import SemanticSearchRequest, SemanticSearchResponse
from src.infrastructure.services.isearch import ISemanticSearchService

router = APIRouter()


@router.post(
    "/projects/{project_id}/semantic-search",
    response_model=SemanticSearchResponse,
    status_code=200,
)
@inject
async def search_project_owner(
    project_id: UUID4,
    body: SemanticSearchRequest,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: ISemanticSearchService = Depends(
        Provide[Container.search_service],
    ),
) -> SemanticSearchResponse:
    """Semantic search within own project (owner only).

    The embedding model is taken from the project, not the request.
    Owner sees all documents in the project.

    Args:
        project_id (UUID4): The project to search.
        body (SemanticSearchRequest): Query, top_k, threshold.
        user_uuid (UUID4): The authenticated user's UUID.
        service (ISemanticSearchService): The injected search service.

    Returns:
        SemanticSearchResponse: Ranked search results.
    """
    try:
        return await service.search_owner(project_id, user_uuid, body)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono projektu",
        )


@router.post(
    "/public/projects/{project_id}/semantic-search",
    response_model=SemanticSearchResponse,
    status_code=200,
)
@inject
async def search_project_public(
    project_id: UUID4,
    body: SemanticSearchRequest,
    service: ISemanticSearchService = Depends(
        Provide[Container.search_service],
    ),
) -> SemanticSearchResponse:
    """Read-only semantic search for public projects.

    Returns only public documents. Returns uniform 404 for both
    non-existent and private projects to prevent enumeration.

    Args:
        project_id (UUID4): The public project to search.
        body (SemanticSearchRequest): Query, top_k, threshold.
        service (ISemanticSearchService): The injected search service.

    Returns:
        SemanticSearchResponse: Ranked search results.
    """
    try:
        return await service.search_public(project_id, body)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono projektu",
        )
