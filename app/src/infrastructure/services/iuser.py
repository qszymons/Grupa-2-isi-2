"""A module containing user service."""


from abc import ABC, abstractmethod

from pydantic import UUID5

from src.core.domain.user import UserIn
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
    async def authenticate_user(self, user: UserIn) -> TokenDTO | None:
        """The method authenticating the user.

        Args:
            user (UserIn): The user data.

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
    async def send_verification_email(self, email: str) -> bool:
        """A method sending a verification email to the user.

        Args:
            email (str): The email of the user.

        Returns:
            bool: Success of the operation.
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
