"""Model containing user-related models"""

from enum import Enum
from pydantic import BaseModel, ConfigDict, UUID1


class UserIn(BaseModel):
    """An input user model."""
    email: str
    password: str


class User(UserIn):
    """Model representing user's attributes in the database."""
    id: UUID1

    model_config = ConfigDict(from_attributes=True, extra="ignore")
