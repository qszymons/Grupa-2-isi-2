"""Module containing semantic search service abstractions."""

from abc import ABC, abstractmethod
from uuid import UUID

from src.core.domain.search import SemanticSearchRequest, SemanticSearchResponse


class ISemanticSearchService(ABC):
    """A class representing a semantic search service."""

    @abstractmethod
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
        """

    @abstractmethod
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
        """
