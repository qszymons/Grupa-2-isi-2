"""A module containing user service."""

from pydantic import UUID4

from src.core.domain.user import UserIn
from src.core.repositories.iuser import IUserRepository
from src.infrastructure.dto.userdto import UserDTO
from src.infrastructure.dto.tokendto import TokenDTO
from src.infrastructure.services.iuser import IUserService
from src.infrastructure.utils.password import verify_password
from src.infrastructure.utils.token import (
    generate_access_token,
    generate_refresh_token,
    generate_activation_token,
    decode_token,
)
from src.email_config import conf
from fastapi_mail import FastMail
from fastapi_mail.schemas import MessageSchema, MessageType


class UserService(IUserService):
    """An abstract class for user service."""

    _repository: IUserRepository

    def __init__(self, repository: IUserRepository) -> None:
        self._repository = repository

    async def register_user(self, user: UserIn) -> UserDTO | None:
        """A method registering a new user.

        Args:
            user (UserIn): The user input data.

        Returns:
            UserDTO | None: The user DTO model.
        """

        new_user = await self._repository.register_user(user)

        if new_user:
            await self.send_verification_email(user.email)

        return new_user

    async def authenticate_user(self, user: UserIn) -> TokenDTO | None:
        """The method authenticating the user.

        Args:
            user (UserIn): The user data.

        Returns:
            TokenDTO | None: The token details.
        """

        if user_data := await self._repository.get_by_email(user.email):
            if verify_password(user.password, user_data.password):
                access_token_details = generate_access_token(user_data.id)
                refresh_token_details = generate_refresh_token(user_data.id)
                # trunk-ignore(bandit/B106)
                return TokenDTO(
                    token_type="Bearer",
                    access_token=access_token_details["access_token"],
                    refresh_token=refresh_token_details["refresh_token"],
                    expires=access_token_details["expires"]
                )

            return None

        return None

    async def get_by_uuid(self, uuid: UUID4) -> UserDTO | None:
        """A method getting user by UUID.

        Args:
            uuid (UUID5): The UUID of the user.

        Returns:
            UserDTO | None: The user data, if found.
        """

        return await self._repository.get_by_uuid(uuid)

    async def get_by_email(self, email: str) -> UserDTO | None:
        """A method getting user by email.

        Args:
            email (str): The email of the user.

        Returns:
            UserDTO | None: The user data, if found.
        """

        return await self.get_by_email(email)

    async def send_verification_email(self, email: str) -> bool | None:
        """A method sending a verification email to the user

        Args:
            email (str): The email of the user

        Returns:
            bool | None: Success of the operation
        """

        user_data = await self._repository.get_by_email(email)

        if user_data and not user_data.is_verified:
            token_details = generate_activation_token(user_data.id)
            token = token_details.get("activation_token")
            verify_url = f"http://localhost:8000/activate/{token}"

            body_message = f"""
                            Hello!

                            Click the link below to verify your account:

                            {verify_url}
                    """

            message = MessageSchema(
                subject="Email verification",
                recipients=[email],
                body=body_message,
                subtype=MessageType.html,
            )

            fm = FastMail(conf)
            await fm.send_message(message)
            return True

        return False

    async def activate_user_with_token(self, token: str) -> bool:
        """A method verifying the user via JWT activation token.

        Args:
            token (str): The JWT activation token.

        Returns:
            bool: Success of the operation.
        """
        decoded = decode_token(token)
        if not decoded:
            return False

        if decoded.get("type") != "activation":
            return False

        user_uuid = decoded.get("sub")
        if not user_uuid:
            return False

        user_data = await self._repository.get_by_uuid(user_uuid)
        if not user_data:
            return False

        if user_data.is_verified:
            return True

        verified_user = await self._repository.verify_user(user_data.email)
        return verified_user is not None