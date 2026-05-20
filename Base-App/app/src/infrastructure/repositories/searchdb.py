"""A repository for semantic search queries."""

from typing import Any
from uuid import UUID

import sqlalchemy
from pgvector.sqlalchemy import Vector

from src.core.repositories.isearch import ISemanticSearchRepository
from src.db import (
    HNSW_EF_SEARCH,
    database,
    project_table,
    document_table,
    document_chunks_table,
    chunk_embeddings_table,
)


class SemanticSearchRepository(ISemanticSearchRepository):
    """Implementation of semantic search with pgvector cosine distance."""

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

        Args:
            project_id (UUID): The project to search within.
            query_embedding (list[float]): The query vector.
            model_name (str): The embedding model name to match.
            embedding_dimensions (int | None): Vector dimensions for HNSW expression indexes.
            owner_id (UUID | None): If set, restrict to this owner.
            only_public_docs (bool): If True, only return public documents.
            top_k (int): Maximum number of results.
            threshold (float): Minimum similarity score [0, 1].

        Returns:
            list[Any]: Ranked results with document metadata and score.
        """

        embedding_expr = chunk_embeddings_table.c.embedding
        if embedding_dimensions:
            embedding_expr = sqlalchemy.cast(
                embedding_expr, Vector(embedding_dimensions),
            )

        distance_expr = embedding_expr.cosine_distance(query_embedding)
        score_expr = (
            sqlalchemy.literal(1) - distance_expr
        ).label("score")

        query = (
            sqlalchemy.select(
                document_table.c.name.label("document_name"),
                document_table.c.public_id.label("document_public_id"),
                document_chunks_table.c.chunk_index,
                document_chunks_table.c.content.label("chunk_content"),
                score_expr,
            )
            .select_from(
                chunk_embeddings_table
                .join(
                    document_chunks_table,
                    chunk_embeddings_table.c.chunk_id
                    == document_chunks_table.c.id,
                )
                .join(
                    document_table,
                    document_chunks_table.c.document_id
                    == document_table.c.id,
                )
                .join(
                    project_table,
                    document_table.c.project_id == project_table.c.id,
                )
            )
            .where(project_table.c.id == project_id)
            .where(
                chunk_embeddings_table.c.model_name
                == project_table.c.embedding_model_name
            )
            .where(chunk_embeddings_table.c.model_name == model_name)
        )

        if owner_id is not None:
            query = query.where(project_table.c.user_id == owner_id)
        else:
            query = query.where(project_table.c.is_public == True)
            if only_public_docs:
                query = query.where(document_table.c.is_public == True)

        query = (
            query
            .where(
                (sqlalchemy.literal(1) - distance_expr) >= threshold,
            )
            .order_by(
                distance_expr.asc(),
                document_table.c.created_at.desc(),
                document_chunks_table.c.id.asc(),
            )
            .limit(top_k)
        )

        async with database.transaction():
            await database.execute(
                sqlalchemy.text(
                    f"SET LOCAL hnsw.ef_search = {HNSW_EF_SEARCH}"
                )
            )
            return await database.fetch_all(query)
