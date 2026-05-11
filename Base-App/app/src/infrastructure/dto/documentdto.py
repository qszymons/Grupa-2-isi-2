"""A module containing document DTO model."""

from datetime import datetime

from pydantic import UUID4, BaseModel, ConfigDict


class DocumentDTO(BaseModel):
    """A DTO model for document."""

    public_id: UUID4
    name: str
    data: str
    is_public: bool
    project_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
