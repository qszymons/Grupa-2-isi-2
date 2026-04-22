"""A repository for project entity."""

from typing import Any, Iterable

from src.core.domain.project import ProjectBroker
from src.core.repositories.iproject import IProjectRepository
from src.db import database, project_table, project_tags_table, tag_table
import sqlalchemy


class ProjectRepository(IProjectRepository):
    """An implementation of repository class for project."""

    async def get_by_user(self, user_id: str) -> Iterable[Any]:
        """Get all projects belonging to a user.

        Args:
            user_id (str): The id of the user.

        Returns:
            Iterable[Any]: The collection of the projects.
        """

        query = project_table \
            .select() \
            .where(project_table.c.user_id == user_id)

        return await database.fetch_all(query)

    async def get_by_name(self, phrase: str) -> Iterable[Any]:
        """Get projects matching name using ILIKE.

        Args:
            phrase (str): The search phrase.

        Returns:
            Iterable[Any]: The matching projects.
        """

        query = project_table \
            .select() \
            .where(project_table.c.name.ilike(f"%{phrase}%"))

        return await database.fetch_all(query)

    async def get_projects_by_tags(
        self,
        name: str | None,
        tags: list[str],
        tag_match: str,
    ) -> Iterable[Any]:
        """Get projects filtered by name and tags.

        Args:
            name (str | None): The project name phrase.
            tags (list[str]): The tag names used for filtering.
            tag_match (str): The filtering mode, either all or any.

        Returns:
            Iterable[Any]: The matching projects.
        """

        query = sqlalchemy.select(project_table)

        if tags:
            query = query.select_from(
                project_table.join(
                    project_tags_table,
                    project_table.c.id == project_tags_table.c.project_id
                ).join(
                    tag_table,
                    project_tags_table.c.tag_id == tag_table.c.id
                )
            ).where(tag_table.c.name.in_(tags))

            query = query.group_by(
                project_table.c.id,
                project_table.c.name,
                project_table.c.data,
                project_table.c.user_id,
            )

            if tag_match == "all":
                query = query.having(sqlalchemy.func.count(tag_table.c.id) == len(tags))

        if name:
            query = query.where(project_table.c.name.ilike(f"%{name}%"))

        return await database.fetch_all(query)

    async def get_by_id(self, project_id: int) -> Any | None:
        """Get a single project by its id.

        Args:
            project_id (int): The project id.

        Returns:
            Any | None: The project if found.
        """

        query = project_table \
            .select() \
            .where(project_table.c.id == project_id)

        return await database.fetch_one(query)

    async def add_project(self, data: ProjectBroker) -> Any | None:
        """Add a new project.

        Args:
            data (ProjectBroker): The project data.

        Returns:
            Any | None: The newly created project.
        """

        query = project_table.insert().values(**data.model_dump())
        last_record_id = await database.execute(query)

        return await self.get_by_id(last_record_id)

    async def update_project(
            self,
            project_id: int,
            data: ProjectBroker,
    ) -> Any | None:
        """Update an existing project.

        Args:
            project_id (int): The project id.
            data (ProjectBroker): The new project data.

        Returns:
            Any | None: The updated project.
        """

        query = project_table \
            .update() \
            .where(project_table.c.id == project_id) \
            .values(**data.model_dump())

        await database.execute(query)

        return await self.get_by_id(project_id)

    async def delete_project(self, project_id: int) -> bool:
        """Delete a project by id.

        Args:
            project_id (int): The project id.

        Returns:
            bool: Success of the operation.
        """

        if not await self.get_by_id(project_id):
            return False

        query = project_table \
            .delete() \
            .where(project_table.c.id == project_id)

        await database.execute(query)

        return True
