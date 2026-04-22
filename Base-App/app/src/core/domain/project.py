"""Modul containing project-related domain models."""

from pydantic import BaseModel, ConfigDict, UUID4, Field
from src.core.domain.tag import Tag

class ProjectIn(BaseModel):
    """Model representing project's attributes."""
    name: str = Field(min_length=3, max_length=80)
    data: str = Field(min_length=1)


class ProjectBroker(ProjectIn):
    """Broker class including user in the model"""
    user_id: UUID4


class Project(ProjectBroker):
    """Model representing project's attributes in the database."""
    id: int
    tags: list[Tag] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, extra="ignore")
