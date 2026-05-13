"""A module containing project DTO model."""

from pydantic import UUID4, BaseModel, ConfigDict, Field

from src.infrastructure.dto.tagdto import TagDTO


class ProjectDTO(BaseModel):
    """A DTO model for project."""

    id: UUID4
    name: str
    data: str
    tags: list[TagDTO] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

