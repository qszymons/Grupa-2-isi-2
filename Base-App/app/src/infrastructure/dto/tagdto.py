"""A module containing tag DTO model."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TagDTO(BaseModel):
    """A DTO model for tag."""

    id: int
    name: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
