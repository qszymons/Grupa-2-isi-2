"""Model containing user-related models"""

from enum import Enum
from email_validator import validate_email, EmailNotValidError
from pydantic import BaseModel, ConfigDict, UUID1, field_validator


class UserIn(BaseModel):
    """An input user model."""
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, val: str) -> str:
        try:
            valid = validate_email(val)
            return valid.email
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email at: {e}")


class User(UserIn):
    """Model representing user's attributes in the database."""
    id: UUID1

    model_config = ConfigDict(from_attributes=True, extra="ignore")
