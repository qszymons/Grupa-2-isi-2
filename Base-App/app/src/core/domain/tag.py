"""Module containing tag-related domain models."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class TagIn(BaseModel):
    """Model representing tag input attributes."""

    name: str

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        """Normalize tag names before saving them."""

        normalized = value.strip().lower()

        if not normalized:
            raise ValueError("Tag musi mieć nazwę")

        if len(normalized) > 64:
            raise ValueError("Tag musi mieć od 1 do 64 znaków")

        return normalized


class Tag(TagIn):
    """Model representing tag attributes stored in the database."""

    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="ignore")
