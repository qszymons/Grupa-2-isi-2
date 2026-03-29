"""Module containing project service implementation."""

from typing import Iterable

from src.core.domain.project import Project, ProjectBroker
from src.core.repositories.iproject import IProjectRepository
from src.infrastructure.services.iproject import IProjectService


class ProjectService(IProjectService):
    """A class implementing the project service."""

    _repository: IProjectRepository

    def __init__(self, repository: IProjectRepository) -> None:
        self._repository = repository

    async def get_project_by_user(self, user_id: str) -> Iterable[Project]:
        """Get projects by user id.

        Args:
            user_id (str): The id of the user.

        Returns:
            Iterable[Project]: The project details.
        """

        return await self._repository.get_by_user(user_id)

    async def get_project_by_name(self, name: str) -> Iterable[Project]:
        """Get projects matching name via ILIKE search.

        Args:
            name (str): The search phrase.

        Returns:
            Iterable[Project]: The matching projects.
        """

        return await self._repository.get_by_name(name)

    async def add_project(self, data: ProjectBroker) -> Project | None:
        """Add a new project.

        Args:
            data (ProjectBroker): The project data.

        Returns:
            Project | None: The newly created project.
        """

        return await self._repository.add_project(data)

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

        return await self._repository.update_project(project_id, data)

    async def delete_project(self, project_id: int) -> bool:
        """Delete a project.

        Args:
            project_id (int): The id of the project.

        Returns:
            bool: Success of the operation.
        """

        return await self._repository.delete_project(project_id)
