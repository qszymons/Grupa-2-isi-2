"""A module containing user service."""


from abc import ABC, abstractmethod

from pydantic import UUID5
from fastapi import UploadFile

from src.core.domain.user import UserIn, UserLogin
from src.infrastructure.dto.userdto import UserDTO
from src.infrastructure.dto.tokendto import TokenDTO


class IUserService(ABC):
    """An abstract class for user service."""

    @abstractmethod
    async def register_user(self, user: UserIn) -> UserDTO | None:
        """A method registering a new user.

        Args:
            user (UserIn): The user input data.

        Returns:
            UserDTO | None: The user DTO model.
        """

    @abstractmethod
    async def authenticate_user(self, user: UserLogin) -> TokenDTO | None:
        """The method authenticating the user.

        Args:
            user (UserLogin): The user data.

        Returns:
            TokenDTO | None: The token details.
        """

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> TokenDTO | None:
        """A method validating refresh token and returning new ones.

        Args:
            refresh_token (str): The refresh token.

        Returns:
            TokenDTO | None: New token details if valid.
        """

    @abstractmethod
    async def get_by_uuid(self, uuid: UUID5) -> UserDTO | None:
        """A method getting user by UUID.

        Args:
            uuid (UUID5): The UUID of the user.

        Returns:
            UserDTO | None: The user data, if found.
        """

    @abstractmethod
    async def get_by_email(self, email: str) -> UserDTO | None:
        """A method getting user by email.

        Args:
            email (str): The email of the user.

        Returns:
            UserDTO | None: The user data, if found.
        """

    @abstractmethod
    async def get_by_username(self, username: str) -> UserDTO | None:
        """A method getting user by username.

        Args:
            username (str): The username of the user.

        Returns:
            UserDTO | None: The user data, if found.
        """

    @abstractmethod
    async def send_verification_email(self, email: str) -> bool:
        """A method sending a verification email to the user.

        Args:
            email (str): The email of the user.

        Returns:
            bool: Success of the operation
        """

    @abstractmethod
    async def activate_user_with_token(self, token: str) -> bool:
        """A method verifying the user via JWT activation token.

        Args:
            token (str): The JWT activation token.

        Returns:
            bool: Success of the operation.
        """

    @abstractmethod
    async def send_password_reset_email(self, email: str) -> bool:
        """A method sending a password reset email to the user.

        Args:
            email (str): The email of the user.

        Returns:
            bool: Success of the operation.
        """

    @abstractmethod
    async def reset_password_with_token(self, token: str, new_password: str) -> bool:
        """A method resetting user password via JWT token.

        Args:
            token (str): The JWT password reset token.
            new_password (str): The new password.

        Returns:
            bool: Success of the operation.
        """

    @abstractmethod
    async def change_password(self, email: str, old_password: str, new_password: str) -> bool:
        """A method changing user password.

        Args:
            email (str): The email of the user.
            old_password (str): The current password.
            new_password (str): The new password.

        Returns:
            bool: Success of the operation.
        """

    @abstractmethod
    async def delete_user(self, uuid: UUID5) -> bool:
        """A method deleting a user by UUID.

        Args:
            uuid (UUID5): The UUID of the user.

        Returns:
            bool: Success of the operation.
        """

    @abstractmethod
    async def update_avatar(self, uuid: UUID5, file: UploadFile) -> UserDTO | None:
        """A method updating the user avatar image.

        Args:
            uuid (UUID5): The UUID of the user.
            file (UploadFile): The avatar image file.

        Returns:
            UserDTO | None: The user DTO data.
        """

    @abstractmethod
    async def update_username(self, uuid: UUID5, username: str) -> UserDTO | None:
        """A method updating the user username.

        Args:
            uuid (UUID5): The UUID of the user.
            username (str): The new username.

        Returns:
            UserDTO | None: The user DTO data.
        """
