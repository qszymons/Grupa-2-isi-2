"""A module containing project DTO model."""

from pydantic import UUID4, BaseModel, ConfigDict


class ProjectDTO(BaseModel):
    """A DTO model for project."""

    id: int
    name: str
    data: str
    user_id: UUID4

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
