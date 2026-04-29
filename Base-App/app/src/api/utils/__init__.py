"""A module containing authentication utility functions."""

from fastapi import Depends
from pydantic import UUID4

from src.api.utils.dependencies import get_current_user, get_current_user_optional
from src.infrastructure.dto.userdto import UserDTO

async def get_current_user_uuid(
    current_user: UserDTO = Depends(get_current_user),
) -> UUID4:
    """Extract and return the current user's UUID using the active session.

    Args:
        current_user (UserDTO): The current authenticated user.

    Returns:
        UUID4: The UUID of the authenticated user.
    """
    return current_user.id

async def get_current_user_uuid_optional(
    current_user: UserDTO | None = Depends(get_current_user_optional),
) -> UUID4 | None:
    """Extract and return the current user's UUID using the active session if available.

    Args:
        current_user (UserDTO | None): The optionally authenticated user.

    Returns:
        UUID4 | None: The UUID of the authenticated user, or None if not authenticated.
    """
    if current_user:
        return current_user.id
    return None
