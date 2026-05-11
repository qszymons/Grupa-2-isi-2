"""Module containing chunk service abstractions."""

from abc import ABC, abstractmethod

from src.core.domain.chunk import Chunk


class IChunkService(ABC):
    """A class representing a chunk service."""

    @abstractmethod
    async def generate_chunks(
        self,
        document_id: int,
        text: str,
        chunk_size: int = 150,
        chunk_overlap: int = 0,
        strategy: str = "length",
    ) -> list[Chunk]:
        """Generate and store chunks for a given document.

        Args:
            document_id (int): The internal document id.
            text (str): The full text of the document.
            chunk_size (int): The size of chunks.
            chunk_overlap (int): The overlap between chunks.
            strategy (str): The chunking strategy ('length' or 'token').

        Returns:
            list[Chunk]: The generated chunks.
        """

    @abstractmethod
    async def rechunk_document(
        self,
        document_id: int,
        text: str,
        chunk_size: int = 150,
        chunk_overlap: int = 0,
        strategy: str = "length",
    ) -> list[Chunk]:
        """Atomically re-chunk a document

        Args:
            document_id (int): The internal document id.
            text (str): The full text of the document.
            chunk_size (int): The size of chunks.
            chunk_overlap (int): The overlap between chunks.
            strategy (str): The chunking strategy.

        Returns:
            list[Chunk]: The new chunks.
        """

    @abstractmethod
    async def get_chunks_for_document(self, document_id: int) -> list[Chunk]:
        """Get all chunks associated with a specific document.

        Args:
            document_id (int): The internal document id.

        Returns:
            list[Chunk]: A list of chunks.
        """

    @abstractmethod
    async def delete_chunks_by_document(self, document_id: int) -> bool:
        """Delete all chunks associated with a specific document.

        Args:
            document_id (int): The internal document id.

        Returns:
            bool: Success of the operation.
        """

    @abstractmethod
    async def generate_embeddings(
        self,
        document_id: int,
        model_name: str,
    ) -> int:
        """Generate embeddings for all chunks of a document.

        Args:
            document_id (int): The internal document id.
            model_name (str): The embedding model to use.

        Returns:
            int: Number of chunks that received embeddings.
        """

    @abstractmethod
    async def get_embedding_info_for_document(
        self,
        document_id: int,
    ) -> list[dict]:
        """Get embedding metadata for document's chunks.

        Args:
            document_id (int): The internal document id.

        Returns:
            list[dict]: Embedding info per chunk.
        """
