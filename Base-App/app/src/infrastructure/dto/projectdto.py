"""A module containing project DTO model."""

from pydantic import UUID4, BaseModel, ConfigDict, Field

from src.infrastructure.dto.tagdto import TagDTO


class ProjectDTO(BaseModel):
    """A DTO model for project."""

    id: int
    name: str
    data: str
    user_id: UUID4
    tags: list[TagDTO] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

