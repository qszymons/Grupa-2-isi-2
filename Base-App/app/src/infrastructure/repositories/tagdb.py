"""A repository for tag entity."""

from typing import Any, Iterable

import sqlalchemy
from asyncpg.exceptions import UniqueViolationError  # type: ignore
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError

from src.core.domain.tag import TagIn
from src.core.repositories.itag import ITagRepository
from src.db import database, project_tags_table, tag_table


class TagRepository(ITagRepository):
    """An implementation of repository class for tag."""

    async def _get_assigned_tag_ids(self, project_id: int) -> set[int]:
        """
        Retrieve currently assigned tag ids for a project.

        Args:
            project_id (int): The id of the project.

        Returns:
            set[int]: The set of assigned tag ids.
        """

        query = sqlalchemy.select(project_tags_table.c.tag_id).where(
            project_tags_table.c.project_id == project_id
        )
        rows = await database.fetch_all(query)

        return {row["tag_id"] for row in rows}

    async def get_all(self) -> Iterable[Any]:
        """
        Retrieve all tags.

        Returns:
            Iterable[Any]: The retrieved tags.
        """

        query = sqlalchemy.select(tag_table).order_by(tag_table.c.name)
        return await database.fetch_all(query)

    async def get_by_id(self, tag_id: int) -> Any | None:
        """
        Retrieve a tag by id.

        Args:
            tag_id (int): The id of the tag.

        Returns:
            Any | None: The retrieved tag details.
        """

        query = sqlalchemy.select(tag_table).where(tag_table.c.id == tag_id)
        return await database.fetch_one(query)

    async def get_by_name(self, name: str) -> Any | None:
        """
        Retrieve a tag by normalized name.

        Args:
            name (str): The search phrase.

        Returns:
            Any | None: The retrieved tag details.
        """

        query = sqlalchemy.select(tag_table).where(tag_table.c.name == name)
        return await database.fetch_one(query)

    async def add_tag(self, data: TagIn) -> Any | None:
        """
        Create a new tag using ON CONFLICT DO NOTHING.

        Args:
            data (TagIn): The new tag data.

        Returns:
            Any | None: The newly created tag details.
        """

        query = pg_insert(tag_table).values(
            **data.model_dump()
        ).on_conflict_do_nothing(
            index_elements=[sqlalchemy.func.lower(tag_table.c.name)]
        ).returning(tag_table.c.id)

        row = await database.fetch_one(query)

        if row is None:
            return None

        return await self.get_by_id(row["id"])

    async def update_tag(self, tag_id: int, data: TagIn) -> Any | None:
        """
        Update an existing tag.

        Args:
            tag_id (int): The id of the tag.
            data (TagIn): The updated tag data.

        Returns:
            Any | None: The updated tag details.
        """

        try:
            query = tag_table.update().where(
                tag_table.c.id == tag_id
            ).values(
                **data.model_dump()
            ).returning(tag_table.c.id)
            row = await database.fetch_one(query)
        except (IntegrityError, UniqueViolationError):
            return None

        if row is None:
            return None

        return await self.get_by_id(tag_id)

    async def delete_tag(self, tag_id: int) -> bool:
        """
        Delete a tag by id.

        Args:
            tag_id (int): The id of the tag to delete.

        Returns:
            bool: Success of the operation.
        """

        if not await self.get_by_id(tag_id):
            return False

        query = tag_table.delete().where(tag_table.c.id == tag_id)
        await database.execute(query)

        return True

    async def assign_tags(self, project_id: int, tag_ids: list[int]) -> None:
        """
        Replace tags assigned to a project with the provided state.

        Args:
            project_id (int): The id of the project.
            tag_ids (list[int]): The list of tag ids to assign.

        Returns:
            None
        """

        desired_tag_ids = list(dict.fromkeys(tag_ids))
        desired_set = set(desired_tag_ids)
        current_set = await self._get_assigned_tag_ids(project_id)

        to_remove = current_set - desired_set
        to_add = [tag_id for tag_id in desired_tag_ids if tag_id not in current_set]

        if not to_remove and not to_add:
            return

        async with database.transaction():
            if to_remove:
                delete_query = project_tags_table.delete().where(
                    project_tags_table.c.project_id == project_id
                ).where(
                    project_tags_table.c.tag_id.in_(to_remove)
                )
                await database.execute(delete_query)

            if to_add:
                values = [
                    {
                        "project_id": project_id,
                        "tag_id": tag_id,
                    }
                    for tag_id in to_add
                ]
                insert_query = pg_insert(project_tags_table).values(
                    values
                ).on_conflict_do_nothing()
                await database.execute(insert_query)

    async def unassign_tag(self, project_id: int, tag_id: int) -> None:
        """
        Unassign a tag from a project.

        Args:
            project_id (int): The id of the project.
            tag_id (int): The id of the tag.

        Returns:
            None
        """

        query = project_tags_table.delete().where(
            project_tags_table.c.project_id == project_id
        ).where(
            project_tags_table.c.tag_id == tag_id
        )
        await database.execute(query)

    async def get_tags_by_project(self, project_id: int) -> Iterable[Any]:
        """
        Retrieve all tags assigned to a project.

        Args:
            project_id (int): The id of the project.

        Returns:
            Iterable[Any]: The retrieved tags.
        """

        query = sqlalchemy.select(tag_table).select_from(
            project_tags_table.join(
                tag_table,
                project_tags_table.c.tag_id == tag_table.c.id,
            )
        ).where(
            project_tags_table.c.project_id == project_id
        ).order_by(
            tag_table.c.name
        )

        return await database.fetch_all(query)
