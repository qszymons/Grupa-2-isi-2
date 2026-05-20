"""A module containing project DTO model."""

from pydantic import UUID4, BaseModel, ConfigDict, Field

from src.infrastructure.dto.tagdto import TagDTO


class ProjectDTO(BaseModel):
    """A DTO model for project."""

    id: UUID4
    name: str
    data: str
    user_id: UUID4
    is_public: bool = False
    embedding_model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"
    tags: list[TagDTO] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )


class PublicProjectDTO(BaseModel):
    """A public project DTO that does not expose owner UUID."""

    id: UUID4
    name: str
    data: str
    is_public: bool = False
    embedding_model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"
    owner_username: str | None = None
    owner_has_image: bool = False
    tags: list[TagDTO] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
