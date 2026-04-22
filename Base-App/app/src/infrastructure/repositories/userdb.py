"""A repository for user entity."""


from typing import Any

from pydantic import UUID5

from src.infrastructure.utils.password import hash_password
from src.core.domain.user import UserIn
from src.core.repositories.iuser import IUserRepository
from src.db import database, user_table, project_table


class UserRepository(IUserRepository):
    """An implementation of repository class for user."""

    async def register_user(self, user: UserIn) -> Any | None:
        """A method registering new user.

        Args:
            user (UserIn): The user input data.

        Returns:
            Any | None: The new user object.
        """

        if await self.get_by_email(user.email):
            return None

        user.password = hash_password(user.password)

        query = user_table.insert().values(**user.model_dump())
        new_user_uuid = await database.execute(query)

        return await self.get_by_uuid(new_user_uuid)

    async def get_by_uuid(self, uuid: UUID5) -> Any | None:
        """A method getting user by UUID.

        Args:
            uuid (UUID5): UUID of the user.

        Returns:
            Any | None: The user object if exists.
        """

        query = user_table \
            .select() \
            .where(user_table.c.id == uuid)
        user = await database.fetch_one(query)

        return user

    async def get_by_email(self, email: str) -> Any | None:
        """A method getting user by email.

        Args:
            email (str): The email of the user.

        Returns:
            Any | None: The user object if exists.
        """

        query = user_table \
            .select() \
            .where(user_table.c.email == email)
        user = await database.fetch_one(query)

        return user

    async def get_by_username(self, username: str) -> Any | None:
        """A method getting user by username.

        Args:
            username (str): The username of the user.

        Returns:
            Any | None: The user object if exists.
        """

        query = user_table \
            .select() \
            .where(user_table.c.username == username)
        user = await database.fetch_one(query)

        return user

    async def verify_user(self, email: str) -> Any | None:
        """A method verifying user status

        Args:
            email (str): The email of the user

        Returns:
            Any | None: The verified user
        """

        query = user_table \
            .update() \
            .where(user_table.c.email == email) \
            .values(is_verified=True)

        await database.execute(query)

        return await self.get_by_email(email)

    async def update_password(self, email: str, new_password: str) -> Any | None:
        """A method updating user password.

        Args:
            email (str): The email of the user.
            new_password (str): The new hashed password.

        Returns:
            Any | None: The updated user.
        """

        query = user_table \
            .update() \
            .where(user_table.c.email == email) \
            .values(password=new_password)

        await database.execute(query)

        return await self.get_by_email(email)

    async def update_user_image(self, uuid: UUID5, image: str | None) -> Any | None:
        """A method updating user image path.

        Args:
            uuid (UUID5): The UUID of the user.
            image (str | None): The new image path.

        Returns:
            Any | None: The updated user.
        """

        query = user_table \
            .update() \
            .where(user_table.c.id == uuid) \
            .values(image=image)

        await database.execute(query)

        return await self.get_by_uuid(uuid)

    async def update_username(self, uuid: UUID5, username: str) -> Any | None:
        """A method updating a user's username.

        Args:
            uuid (UUID5): The UUID of the user.
            username (str): The new username.

        Returns:
            Any | None: The updated user.
        """

        query = user_table \
            .update() \
            .where(user_table.c.id == uuid) \
            .values(username=username)

        await database.execute(query)

        return await self.get_by_uuid(uuid)

    async def delete_user(self, uuid: UUID5) -> bool:
        """A method deleting a user by UUID.

        Args:
            uuid (UUID5): The UUID of the user.

        Returns:
            bool: Success of the operation.
        """
        
        delete_projects_query = project_table \
            .delete() \
            .where(project_table.c.user_id == uuid)
            
        await database.execute(delete_projects_query)

        query = user_table \
            .delete() \
            .where(user_table.c.id == uuid)

        await database.execute(query)

        return True
