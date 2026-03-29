"""A module containing authentication utility functions."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import UUID4

from src.infrastructure.utils.consts import SECRET_KEY, ALGORITHM

bearer_scheme = HTTPBearer()


async def get_current_user_uuid(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UUID4:
    """Extract and return the current user's UUID from the JWT token.

    Args:
        credentials (HTTPAuthorizationCredentials): The Bearer credentials.

    Raises:
        HTTPException: If the token is invalid or expired.

    Returns:
        UUID4: The UUID of the authenticated user.
    """

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_uuid: str | None = payload.get("sub")

        if user_uuid is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing subject",
            )

        return UUID4(user_uuid)

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )
