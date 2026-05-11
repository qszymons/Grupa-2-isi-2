"""Module containing chunking strategy abstractions."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ChunkData:
    """A lightweight data class representing a single chunk result.

    Args:
        content: The text content of the chunk.
        char_offset: The character offset in the original text.
        chunk_index: The sequential index of the chunk.
        token_count: The number of tokens in the chunk
    """

    content: str
    char_offset: int
    chunk_index: int
    token_count: int | None = None


class IChunking(ABC):
    """Abstract base class for chunking strategies."""

    @abstractmethod
    def chunk(
        self,
        text: str,
        chunk_size: int,
        chunk_overlap: int,
    ) -> list[ChunkData]:
        """Split text into chunks according to the strategy.

        Args:
            text (str): The full text to split.
            chunk_size (int): The maximum size of a chunk (unit depends on strategy).
            chunk_overlap (int): The overlap between consecutive chunks.

        Returns:
            list[ChunkData]: The list of produced chunks.
        """
