"""A module containing authentication utility functions."""

from fastapi import Depends
from pydantic import UUID4

from src.api.utils.dependencies import get_current_user
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
