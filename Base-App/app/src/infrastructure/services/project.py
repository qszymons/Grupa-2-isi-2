"""Module containing project service implementation."""

from typing import Iterable, Any

from src.core.domain.project import Project, ProjectBroker
from src.core.repositories.iproject import IProjectRepository
from src.core.repositories.itag import ITagRepository
from src.infrastructure.services.iproject import IProjectService


class ProjectService(IProjectService):
    """A class implementing the project service."""

    _repository: IProjectRepository
    _tag_repository: ITagRepository

    def __init__(
        self,
        repository: IProjectRepository,
        tag_repository: ITagRepository,
    ) -> None:
        self._repository = repository
        self._tag_repository = tag_repository

    async def _attach_tags(self, project: Any) -> Project:
        """Attach tags to a project record."""
        project_dict = dict(project)
        tags = await self._tag_repository.get_tags_by_project(project_dict["id"])
        project_dict["tags"] = [dict(t) for t in tags]
        return Project(**project_dict)

    async def get_project_by_user(self, user_id: str) -> Iterable[Project]:
        """Get projects by user id.

        Args:
            user_id (str): The id of the user.

        Returns:
            Iterable[Project]: The project details.
        """

        projects = await self._repository.get_by_user(user_id)
        return [await self._attach_tags(p) for p in projects]

    async def get_project_by_name(self, name: str) -> Iterable[Project]:
        """Get projects matching name via ILIKE search.

        Args:
            name (str): The search phrase.

        Returns:
            Iterable[Project]: The matching projects.
        """

        projects = await self._repository.get_by_name(name)
        return [await self._attach_tags(p) for p in projects]

    async def add_project(self, data: ProjectBroker) -> Project | None:
        """Add a new project.

        Args:
            data (ProjectBroker): The project data.

        Returns:
            Project | None: The newly created project.
        """

        project = await self._repository.add_project(data)
        if project:
            return await self._attach_tags(project)
        return None

    async def update_project(
        self,
        project_id: int,
        data: ProjectBroker,
    ) -> Project | None:
        """Update an existing project.

        Args:
            project_id (int): The id of the project.
            data (ProjectBroker): The updated project data.

        Returns:
            Project | None: The updated project details.
        """

        project = await self._repository.update_project(project_id, data)
        if project:
            return await self._attach_tags(project)
        return None

    async def get_projects_by_tags(
        self,
        name: str | None,
        tags: list[str],
        tag_match: str,
    ) -> Iterable[Project]:
        """Get projects filtered by tags and optionally name.

        Args:
            name (str | None): The search phrase.
            tags (list[str]): The tags to filter by.
            tag_match (str): The matching mode (all/any).

        Returns:
            Iterable[Project]: The matching projects.
        """

        projects = await self._repository.get_projects_by_tags(name, tags, tag_match)
        return [await self._attach_tags(p) for p in projects]

    async def delete_project(self, project_id: int) -> bool:
        """Delete a project.

        Args:
            project_id (int): The id of the project.

        Returns:
            bool: Success of the operation.
        """

        return await self._repository.delete_project(project_id)
