"""Module containing chunk-related domain models."""

from pydantic import BaseModel, ConfigDict


class ChunkBroker(BaseModel):
    """Model representing chunk's input attributes for persistence."""

    document_id: int
    chunk_index: int
    content: str
    char_offset: int
    token_count: int | None = None
    strategy: str | None = None
    chunk_size_used: int | None = None
    chunk_overlap_used: int | None = None


class Chunk(ChunkBroker):
    """Model representing chunk's attributes in the database."""

    id: int

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class ChunkEmbeddingBroker(BaseModel):
    """Input model for persisting a chunk embedding."""

    chunk_id: int
    model_name: str
    embedding: list[float]


class ChunkEmbedding(ChunkEmbeddingBroker):
    """Model representing a stored chunk embedding."""

    id: int

    model_config = ConfigDict(from_attributes=True, extra="ignore")
