"""Module containing semantic search domain models."""

from pydantic import BaseModel, ConfigDict, Field, UUID4


class SemanticSearchRequest(BaseModel):
    """Request body for semantic search."""

    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=10, ge=1, le=50)
    threshold: float = Field(default=0.3, ge=0.0, le=1.0)


class SearchResultItem(BaseModel):
    """A single search result with chunk content and score."""

    document_name: str
    document_public_id: UUID4
    chunk_index: int
    chunk_content: str
    score: float

    model_config = ConfigDict(from_attributes=True)


class SemanticSearchResponse(BaseModel):
    """Response wrapper for semantic search results."""

    project_id: UUID4
    model_name: str
    results: list[SearchResultItem]
    total: int
