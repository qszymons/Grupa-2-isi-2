"""Module containing chunk repository abstractions."""

from abc import ABC, abstractmethod
from typing import Any, Iterable

from src.core.domain.chunk import ChunkBroker, ChunkEmbeddingBroker


class IChunkRepository(ABC):
    """An abstract class representing protocol of chunk repository."""

    @abstractmethod
    async def get_by_document(self, document_id: int) -> Iterable[Any]:
        """The abstract getting all chunks for a document.

        Args:
            document_id (int): The internal id of the document.

        Returns:
            Iterable[Any]: The collection of document chunks.
        """

    @abstractmethod
    async def add_chunks(
        self,
        chunks: list[ChunkBroker],
    ) -> Iterable[Any]:
        """The abstract adding chunks to the data storage.

        Args:
            chunks (list[ChunkBroker]): The list of chunks to store.

        Returns:
            Iterable[Any]: The newly created chunks.
        """

    @abstractmethod
    async def delete_by_document(self, document_id: int) -> bool:
        """The abstract removing all chunks for a document.

        Args:
            document_id (int): The internal id of the document.

        Returns:
            bool: Success of the operation.
        """

    @abstractmethod
    async def replace_chunks(
        self,
        document_id: int,
        chunks: list[ChunkBroker],
    ) -> Iterable[Any]:
        """Atomically replace all chunks for a document.

        Args:
            document_id (int): The document id.
            chunks (list[ChunkBroker]): The new chunks.

        Returns:
            Iterable[Any]: The newly created chunks.
        """

    @abstractmethod
    async def add_embeddings_batch(
        self,
        embeddings: list[ChunkEmbeddingBroker],
    ) -> None:
        """Batch insert embeddings for chunks.

        Args:
            embeddings (list[ChunkEmbeddingBroker]): Embeddings to store.
        """

    @abstractmethod
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
            Iterable[Any]: The embeddings.
        """

    @abstractmethod
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
