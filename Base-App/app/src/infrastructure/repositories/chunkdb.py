"""A repository for chunk entity."""

from typing import Any, Iterable

from src.core.domain.chunk import ChunkBroker, ChunkEmbeddingBroker
from src.core.repositories.ichunk import IChunkRepository
from src.db import database, document_chunks_table, chunk_embeddings_table


class ChunkRepository(IChunkRepository):
    """An implementation of repository class for chunk."""

    async def get_by_document(self, document_id: int) -> Iterable[Any]:
        """Get all chunks for a document, ordered by chunk_index.

        Args:
            document_id (int): The internal document id.

        Returns:
            Iterable[Any]: The collection of document chunks.
        """

        query = document_chunks_table \
            .select() \
            .where(document_chunks_table.c.document_id == document_id) \
            .order_by(document_chunks_table.c.chunk_index)

        return await database.fetch_all(query)

    async def add_chunks(
        self,
        chunks: list[ChunkBroker],
    ) -> Iterable[Any]:
        """Add multiple chunks in a single batch insert.

        Args:
            chunks (list[ChunkBroker]): The list of chunks to store.

        Returns:
            Iterable[Any]: The newly created chunks.
        """

        if not chunks:
            return []

        values = [chunk.model_dump() for chunk in chunks]
        query = document_chunks_table.insert()
        await database.execute_many(query, values)

        document_id = chunks[0].document_id
        return await self.get_by_document(document_id)

    async def delete_by_document(self, document_id: int) -> bool:
        """Delete all chunks for a document.

        Args:
            document_id (int): The internal document id.

        Returns:
            bool: True if any chunks were deleted.
        """

        query = document_chunks_table \
            .delete() \
            .where(document_chunks_table.c.document_id == document_id)

        await database.execute(query)

        return True

    async def replace_chunks(
        self,
        document_id: int,
        chunks: list[ChunkBroker],
    ) -> Iterable[Any]:
        """Atomically replace all chunks for a document.

        Uses a DB transaction so that on failure the old chunks
        are preserved.

        Args:
            document_id (int): The document id.
            chunks (list[ChunkBroker]): The new chunks.

        Returns:
            Iterable[Any]: The newly created chunks.
        """
        async with database.transaction():

            delete_q = document_chunks_table \
                .delete() \
                .where(document_chunks_table.c.document_id == document_id)
            await database.execute(delete_q)

            if chunks:
                values = [chunk.model_dump() for chunk in chunks]
                await database.execute_many(
                    document_chunks_table.insert(), values,
                )

        return await self.get_by_document(document_id)

    async def add_embeddings_batch(
        self,
        embeddings: list[ChunkEmbeddingBroker],
    ) -> None:
        """Batch insert embeddings for chunks.

        Deletes existing embeddings for the same chunk+model,
        then batch inserts new ones in a single transaction.

        Args:
            embeddings (list[ChunkEmbeddingBroker]): Embeddings to store.
        """
        if not embeddings:
            return

        async with database.transaction():
            for emb in embeddings:
                await database.execute(
                    chunk_embeddings_table.delete().where(
                        (chunk_embeddings_table.c.chunk_id == emb.chunk_id)
                        & (chunk_embeddings_table.c.model_name == emb.model_name)
                    )
                )

            values = [emb.model_dump() for emb in embeddings]
            await database.execute_many(
                chunk_embeddings_table.insert(), values,
            )

    async def get_embeddings_by_document(
        self,
        document_id: int,
        model_name: str | None = None,
    ) -> Iterable[Any]:
        """Get embeddings for all chunks of a document.

        Args:
            document_id (int): The document id.
            model_name (str | None): Optional filter by model.

        Returns:
            Iterable[Any]: The embeddings with chunk info.
        """
        query = chunk_embeddings_table \
            .join(
                document_chunks_table,
                chunk_embeddings_table.c.chunk_id == document_chunks_table.c.id,
            ) \
            .select() \
            .where(document_chunks_table.c.document_id == document_id)

        if model_name:
            query = query.where(
                chunk_embeddings_table.c.model_name == model_name,
            )

        query = query.order_by(document_chunks_table.c.chunk_index)

        return await database.fetch_all(query)

    async def delete_embeddings_by_document(
        self,
        document_id: int,
        model_name: str | None = None,
    ) -> bool:
        """Delete embeddings for a document, optionally by model.

        Args:
            document_id (int): The document id.
            model_name (str | None): Optional model filter.

        Returns:
            bool: Success of the operation.
        """
        chunk_ids_q = document_chunks_table \
            .select() \
            .with_only_columns(document_chunks_table.c.id) \
            .where(document_chunks_table.c.document_id == document_id)

        chunks = await database.fetch_all(chunk_ids_q)
        ids = [dict(c)["id"] for c in chunks]

        if not ids:
            return True

        query = chunk_embeddings_table \
            .delete() \
            .where(chunk_embeddings_table.c.chunk_id.in_(ids))

        if model_name:
            query = query.where(
                chunk_embeddings_table.c.model_name == model_name,
            )

        await database.execute(query)
        return True
