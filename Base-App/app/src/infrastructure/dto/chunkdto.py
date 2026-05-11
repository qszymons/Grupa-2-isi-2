"""A module containing chunk DTO model."""

from pydantic import BaseModel, ConfigDict


class ChunkDTO(BaseModel):
    """A DTO model for chunk."""

    chunk_index: int
    content: str
    char_offset: int
    token_count: int | None = None
    strategy: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )


class ChunkEmbeddingDTO(BaseModel):
    """DTO for chunk embedding metadata."""

    chunk_index: int
    model_name: str

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
