"""A repository for user entity."""

from abc import ABC, abstractmethod
from typing import Any

from pydantic import UUID5

from src.core.domain.user import UserIn


class IUserRepository(ABC):
    """An abstract repository class for user."""

    @abstractmethod
    async def register_user(self, user: UserIn) -> Any | None:
        """A method registering new user.

        Args:
            user (UserIn): The user input data.

        Returns:
            Any | None: The new user object.
        """

    @abstractmethod
    async def get_by_uuid(self, uuid: UUID5) -> Any | None:
        """A method getting user by UUID.

        Args:
            uuid (UUID5): UUID of the user.

        Returns:
            Any | None: The user object if exists.
        """

    @abstractmethod
    async def get_by_email(self, email: str) -> Any | None:
        """A method getting user by email.

        Args:
            email (str): The email of the user.

        Returns:
            Any | None: The user object if exists.
        """

    @abstractmethod
    async def get_by_username(self, username: str) -> Any | None:
        """A method getting user by username.

        Args:
            username (str): The username of the user.

        Returns:
            Any | None: The user object if exists.
        """

    @abstractmethod
    async def verify_user(self, email: str) -> Any | None:
        """A method verifying the user

        Args:
            email (str): The email of the user

        Returns:
            Any | None: The verified user
        """

    @abstractmethod
    async def update_password(self, email: str, new_password: str) -> Any | None:
        """A method updating user password.

        Args:
            email (str): The email of the user.
            new_password (str): The new hashed password.

        Returns:
            Any | None: The updated user.
        """

    @abstractmethod
    async def update_user_image(self, uuid: UUID5, image: str | None) -> Any | None:
        """A method updating user image path.

        Args:
            uuid (UUID5): The UUID of the user.
            image (str | None): The new image path.

        Returns:
            Any | None: The updated user.
        """

    @abstractmethod
    async def delete_user(self, uuid: UUID5) -> bool:
        """A method deleting a user by UUID.

        Args:
            uuid (UUID5): The UUID of the user.

        Returns:
            bool: Success of the operation.
        """