"""A module containing user service."""

from pydantic import UUID4
import os
import shutil
from fastapi import UploadFile

from src.core.domain.user import UserIn, UserLogin
from src.core.repositories.iuser import IUserRepository
from src.infrastructure.dto.userdto import UserDTO
from src.infrastructure.dto.tokendto import TokenDTO
from src.infrastructure.services.iuser import IUserService
from src.infrastructure.utils.password import verify_password
from src.infrastructure.utils.token import (
    generate_access_token,
    generate_refresh_token,
    generate_activation_token,
    generate_password_reset_token,
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

    async def authenticate_user(self, user: UserLogin) -> TokenDTO | None:
        """The method authenticating the user.

        Args:
            user (UserLogin): The user data.

        Returns:
            TokenDTO | None: The token details.
        """

        user_data = await self._repository.get_by_email(user.login)
        if not user_data:
            user_data = await self._repository.get_by_username(user.login)

        if user_data:
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

    async def refresh_access_token(self, refresh_token: str) -> TokenDTO | None:
        """A method validating refresh token and returning new ones.

        Args:
            refresh_token (str): The refresh token.

        Returns:
            TokenDTO | None: New token details if valid.
        """
        decoded = decode_token(refresh_token)
        if not decoded or decoded.get("type") != "refresh":
            return None

        user_uuid = decoded.get("sub")
        if not user_uuid:
            return None

        user_data = await self._repository.get_by_uuid(user_uuid)
        if not user_data:
            return None

        access_token_details = generate_access_token(user_data.id)
        refresh_token_details = generate_refresh_token(user_data.id)

        return TokenDTO(
            token_type="Bearer",
            access_token=access_token_details["access_token"],
            refresh_token=refresh_token_details["refresh_token"],
            expires=access_token_details["expires"]
        )

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

        return await self._repository.get_by_email(email)

    async def get_by_username(self, username: str) -> UserDTO | None:
        """A method getting user by username.

        Args:
            username (str): The username of the user.

        Returns:
            UserDTO | None: The user data, if found.
        """

        return await self._repository.get_by_username(username)

    async def send_verification_email(self, email: str) -> bool:
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
            verify_url = f"http://localhost:3000/activate/{token}"

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

    async def send_password_reset_email(self, email: str) -> bool:
        """A method sending a password reset email to the user.

        Args:
            email (str): The email of the user.

        Returns:
            bool: Success of the operation.
        """

        user_data = await self._repository.get_by_email(email)

        if user_data:
            token_details = generate_password_reset_token(user_data.id)
            token = token_details.get("password_reset_token")
            reset_url = f"http://localhost:3000/reset-password/{token}"

            body_message = f"""
                            Hello!

                            Click the link below to reset your password:

                            {reset_url}

                            If you did not request a password reset, please ignore this email.
                    """

            message = MessageSchema(
                subject="Password reset",
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

    async def reset_password_with_token(self, token: str, new_password: str) -> bool:
        """A method resetting user password via JWT token.

        Args:
            token (str): The JWT password reset token.
            new_password (str): The new password.

        Returns:
            bool: Success of the operation.
        """
        decoded = decode_token(token)
        if not decoded:
            return False

        if decoded.get("type") != "password_reset":
            return False

        user_uuid = decoded.get("sub")
        if not user_uuid:
            return False

        user_data = await self._repository.get_by_uuid(user_uuid)
        if not user_data:
            return False

        from src.infrastructure.utils.password import hash_password
        hashed_password = hash_password(new_password)

        updated_user = await self._repository.update_password(user_data.email, hashed_password)
        return updated_user is not None

    async def change_password(self, email: str, old_password: str, new_password: str) -> bool:
        """A method changing user password.

        Args:
            email (str): The email of the user.
            old_password (str): The current password.
            new_password (str): The new password.

        Returns:
            bool: Success of the operation.
        """
        user_data = await self._repository.get_by_email(email)
        if not user_data:
            return False

        if not verify_password(old_password, user_data.password):
            return False

        from src.infrastructure.utils.password import hash_password
        hashed_password = hash_password(new_password)

        updated_user = await self._repository.update_password(email, hashed_password)
        return updated_user is not None

    async def delete_user(self, uuid: UUID4) -> bool:
        """A method deleting a user by UUID.

        Args:
            uuid (UUID4): The UUID of the user.

        Returns:
            bool: Success of the operation.
        """
        return await self._repository.delete_user(uuid)

    async def update_avatar(self, uuid: UUID4, file: UploadFile) -> UserDTO | None:
        """A method updating user avatar.

        Args:
            uuid (UUID4): The UUID of the user.
            file (UploadFile): The avatar image file.

        Returns:
            UserDTO | None: The user DTO model.
        """
        
        file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
        filename = f"{uuid}.{file_extension}"
        
        directory_path = os.path.join("src", "uploads", "avatars")
        os.makedirs(directory_path, exist_ok=True)
        
        for existing_file in os.listdir(directory_path):
            if existing_file.startswith(f"{uuid}."):
                try:
                    os.remove(os.path.join(directory_path, existing_file))
                except OSError:
                    pass
        
        file_path = os.path.join(directory_path, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image_url = f"/api/avatar/{uuid}"
        updated_user = await self._repository.update_user_image(uuid, image_url)
        
        if updated_user:
            return UserDTO(**dict(updated_user))
            
        return None

    async def update_username(self, uuid: UUID4, username: str) -> UserDTO | None:
        """A method updating user username.

        Args:
            uuid (UUID4): The UUID of the user.
            username (str): The new username.

        Returns:
            UserDTO | None: The user DTO model.
        """
        
        # update directly in db
        updated_user = await self._repository.update_username(uuid, username)
        if updated_user:
            return UserDTO(**dict(updated_user))
            
        return None