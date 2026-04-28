"""Module containing document-related domain models."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, UUID4, Field


class DocumentIn(BaseModel):
    """Model representing document's input attributes."""

    name: str = Field(min_length=1, max_length=255)
    data: str = Field(min_length=1)
    is_public: bool = False


class DocumentBroker(DocumentIn):
    """Broker class including project reference in the model."""

    project_id: int


class Document(DocumentBroker):
    """Model representing document's attributes in the database."""

    id: int
    public_id: UUID4
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="ignore")
