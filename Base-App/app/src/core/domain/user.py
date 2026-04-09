"""Model containing user-related models"""

import re
from email_validator import validate_email, EmailNotValidError
from pydantic import BaseModel, ConfigDict, UUID1, field_validator


class UserLogin(BaseModel):
    """A model for user login."""
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, val: str) -> str:
        try:
            valid = validate_email(val, check_deliverability=False)
            return valid.normalized
        except EmailNotValidError as e:
            raise ValueError(f"Nieprawidłowy adres e-mail: {e}")


class UserIn(UserLogin):
    """An input user model for registration."""
    username: str
    image: str | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, val: str) -> str:
        if len(val) < 3 or len(val) > 20:
            raise ValueError("Nazwa użytkownika musi mieć od 3 do 20 znaków.")
        if not re.match(r"^[a-zA-Z0-9_-]+$", val):
            raise ValueError("Nazwa użytkownika może zawierać tylko litery, cyfry, myślniki i podkreślenia.")
        return val

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, val: str) -> str:
        if len(val) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków.")

        if not re.search(r"[A-Z]", val):
            raise ValueError("Hasło musi zawierać co najmniej jedną wielką literę.")

        if not re.search(r"\d", val):
            raise ValueError("Hasło musi zawierać co najmniej jedną cyfrę.")

        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", val):
            raise ValueError("Hasło musi zawierać co najmniej jeden znak specjalny.")

        return val


class User(UserIn):
    """Model representing user's attributes in the database."""
    id: UUID1
    is_verified: bool = False

    model_config = ConfigDict(from_attributes=True, extra="ignore")
