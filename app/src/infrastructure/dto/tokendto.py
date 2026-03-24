"""A DTO model for token details."""


from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TokenDTO(BaseModel):
    """A DTO model for token details."""
    token_type: str
    access_token: str
    refresh_token: str
    expires: datetime

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
