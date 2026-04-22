"""Modul containing project-related domain models."""

from pydantic import BaseModel, ConfigDict, UUID4, Field

class ProjectIn(BaseModel):
    """Model representing project's attributes."""
    name: str = Field(min_length=3, max_length=80)
    data: str


class ProjectBroker(ProjectIn):
    """Broker class including user in the model"""
    user_id: UUID4


class Project(ProjectBroker):
    """Model representing project's attributes in the database."""
    id: int

    model_config = ConfigDict(from_attributes=True, extra="ignore")
