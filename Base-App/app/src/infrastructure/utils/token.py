"""A module containing helper functions for token generation."""

from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from pydantic import UUID4

from src.infrastructure.utils.consts import (
    EXPIRATION_MINUTES,
    REFRESH_EXPIRATION_MINUTES,
    ACTIVATION_EXPIRATION_MINUTES,
    ALGORITHM,
    SECRET_KEY,
)


def generate_access_token(user_uuid: UUID4) -> dict:
    """A function returning JWT access token for user.

    Args:
        user_uuid (UUID4): The UUID of the user.

    Returns:
        dict: The token details.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=EXPIRATION_MINUTES)
    jwt_data = {"sub": str(user_uuid), "exp": expire, "type": "access"}
    encoded_jwt = jwt.encode(jwt_data, key=SECRET_KEY, algorithm=ALGORITHM)

    return {"access_token": encoded_jwt, "expires": expire}


def generate_refresh_token(user_uuid: UUID4) -> dict:
    """A function returning JWT refresh token for user.

    Args:
        user_uuid (UUID4): The UUID of the user.

    Returns:
        dict: The token details.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_EXPIRATION_MINUTES)
    jwt_data = {"sub": str(user_uuid), "exp": expire, "type": "refresh"}
    encoded_jwt = jwt.encode(jwt_data, key=SECRET_KEY, algorithm=ALGORITHM)

    return {"refresh_token": encoded_jwt, "expires": expire}


def generate_activation_token(user_uuid: UUID4) -> dict:
    """A function returning JWT activation token for user.

    Args:
        user_uuid (UUID4): The UUID of the user.

    Returns:
        dict: The token details.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACTIVATION_EXPIRATION_MINUTES)
    jwt_data = {"sub": str(user_uuid), "exp": expire, "type": "activation"}
    encoded_jwt = jwt.encode(jwt_data, key=SECRET_KEY, algorithm=ALGORITHM)

    return {"activation_token": encoded_jwt, "expires": expire}


def decode_token(token: str) -> dict | None:
    """A function decoding the JWT token.

    Args:
        token (str): The JWT token string.

    Returns:
        dict | None: The decoded JWT data, or None if invalid or expired.
    """
    try:
        return jwt.decode(token, key=SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
