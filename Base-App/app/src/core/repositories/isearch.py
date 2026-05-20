"""Module containing semantic search repository abstractions."""

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class ISemanticSearchRepository(ABC):
    """An abstract class representing protocol of semantic search repository."""

    @abstractmethod
    async def search_project_chunks(
        self,
        project_id: UUID,
        query_embedding: list[float],
        model_name: str,
        embedding_dimensions: int | None,
        owner_id: UUID | None,
        only_public_docs: bool,
        top_k: int,
        threshold: float,
    ) -> list[Any]:
        """Execute vector similarity search with ACL filters in SQL.

        All access control is enforced at the SQL level — never filter
        permissions in Python after a global vector scan.

        Args:
            project_id (UUID): The project to search within.
            query_embedding (list[float]): The query vector.
            model_name (str): The embedding model name to match.
            embedding_dimensions (int | None): Vector dimensions for HNSW
                expression indexes.
            owner_id (UUID | None): If set, restrict to this owner.
            only_public_docs (bool): If True, only return public documents.
            top_k (int): Maximum number of results.
            threshold (float): Minimum similarity score [0, 1].

        Returns:
            list[Any]: Ranked results with document metadata and score.
        """
