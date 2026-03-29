"""Model containing user-related models"""

import re
from email_validator import validate_email, EmailNotValidError
from pydantic import BaseModel, ConfigDict, UUID1, field_validator


class UserIn(BaseModel):
    """An input user model."""
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, val: str) -> str:
        if len(val) < 8:
            raise ValueError("Password must be at least 8 characters long.")

        if not re.search(r"[A-Z]", val):
            raise ValueError("Password must contain at least one uppercase letter.")

        if not re.search(r"\d", val):
            raise ValueError("Password must contain at least one digit.")

        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", val):
            raise ValueError("Password must contain at least one special character.")

        return val

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, val: str) -> str:
        try:
            valid = validate_email(val, check_deliverability=False)
            return valid.normalized
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email at: {e}")


class User(UserIn):
    """Model representing user's attributes in the database."""
    id: UUID1
    is_verified: bool = False

    model_config = ConfigDict(from_attributes=True, extra="ignore")
