"""Module containing semantic search service implementation."""

from uuid import UUID

from src.core.domain.search import (
    SearchResultItem,
    SemanticSearchRequest,
    SemanticSearchResponse,
)
from src.core.repositories.iproject import IProjectRepository
from src.core.repositories.isearch import ISemanticSearchRepository
from src.infrastructure.services.iembedding import IEmbeddingService
from src.infrastructure.services.isearch import ISemanticSearchService


class SemanticSearchService(ISemanticSearchService):
    """Semantic search service orchestrating model, ACL, and ranking."""

    _project_repo: IProjectRepository
    _search_repo: ISemanticSearchRepository
    _embedding: IEmbeddingService

    def __init__(
        self,
        project_repository: IProjectRepository,
        search_repository: ISemanticSearchRepository,
        embedding_service: IEmbeddingService,
    ) -> None:
        """Initialize the semantic search service.

        Args:
            project_repository: Repository for project access.
            search_repository: Repository for vector search.
            embedding_service: Service for generating query embeddings.
        """
        self._project_repo = project_repository
        self._search_repo = search_repository
        self._embedding = embedding_service

    async def search_owner(
        self,
        project_id: UUID,
        user_id: UUID,
        request: SemanticSearchRequest,
    ) -> SemanticSearchResponse:
        """Search within a project as its owner (sees all documents).

        Args:
            project_id (UUID): The project to search.
            user_id (UUID): The authenticated owner's id.
            request (SemanticSearchRequest): Search parameters.

        Returns:
            SemanticSearchResponse: Ranked results.

        Raises:
            ValueError: If project not found or not owned by user.
        """
        project = await self._project_repo.get_by_id(project_id)

        if project is None or dict(project)["user_id"] != user_id:
            raise ValueError("project_not_found")

        model_name = dict(project)["embedding_model_name"]

        return await self._execute_search(
            project_id=project_id,
            model_name=model_name,
            request=request,
            owner_id=user_id,
            only_public_docs=False,
        )

    async def search_public(
        self,
        project_id: UUID,
        request: SemanticSearchRequest,
    ) -> SemanticSearchResponse:
        """Read-only search within a public project.

        Args:
            project_id (UUID): The public project to search.
            request (SemanticSearchRequest): Search parameters.

        Returns:
            SemanticSearchResponse: Ranked results (public docs only).

        Raises:
            ValueError: If project not found or not public.
        """

        project = await self._project_repo.get_by_id(project_id)

        if project is None or not dict(project).get("is_public"):
            raise ValueError("project_not_found")

        model_name = dict(project)["embedding_model_name"]

        return await self._execute_search(
            project_id=project_id,
            model_name=model_name,
            request=request,
            owner_id=None,
            only_public_docs=True,
        )

    async def _execute_search(
        self,
        project_id: UUID,
        model_name: str,
        request: SemanticSearchRequest,
        owner_id: UUID | None,
        only_public_docs: bool,
    ) -> SemanticSearchResponse:
        """Core search logic shared by owner and public flows.

        Args:
            project_id: The project id.
            model_name: The project's embedding model.
            request: Search parameters.
            owner_id: Owner UUID for private search, None for public.
            only_public_docs: Whether to filter by document visibility.

        Returns:
            SemanticSearchResponse: The search response.
        """

        query_embedding = self._embedding.embed_query(
            request.query, model_name,
        )

        model_info = self._embedding.get_model_info(model_name)
        expected_dim = model_info.get("dimensions")
        if expected_dim and len(query_embedding) != expected_dim:
            raise ValueError(
                f"dimension_mismatch: expected {expected_dim}, "
                f"got {len(query_embedding)}"
            )

        rows = await self._search_repo.search_project_chunks(
            project_id=project_id,
            query_embedding=query_embedding,
            model_name=model_name,
            embedding_dimensions=expected_dim,
            owner_id=owner_id,
            only_public_docs=only_public_docs,
            top_k=request.top_k,
            threshold=request.threshold,
        )

        results = [
            SearchResultItem(
                document_name=dict(r)["document_name"],
                document_public_id=dict(r)["document_public_id"],
                chunk_index=dict(r)["chunk_index"],
                chunk_content=dict(r)["chunk_content"],
                score=max(0.0, min(1.0, float(dict(r)["score"]))),
            )
            for r in rows
        ]

        return SemanticSearchResponse(
            project_id=project_id,
            model_name=model_name,
            results=results,
            total=len(results),
        )
