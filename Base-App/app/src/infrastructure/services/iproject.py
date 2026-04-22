"""Module containing project service abstractions."""

from abc import ABC, abstractmethod
from typing import Iterable

from src.core.domain.project import Project, ProjectBroker


class IProjectService(ABC):
    """A class representing a project service."""

    @abstractmethod
    async def get_project_by_user(self, user_id: str) -> Iterable[Project]:
        """The method getting projects by provided user.

        Args:
            user_id (int): The id of the user.

        Returns:
            Iterable[Project]: The project details.
        """

    @abstractmethod
    async def get_project_by_name(self, name: str) -> Iterable[Project]:
        """The method getting projects by provided name.

        Args:
            name (str): The name of the project.

        Returns:
            Iterable[Project]: The project details.
        """

    @abstractmethod
    async def add_project(self, data: ProjectBroker) -> ProjectBroker | None:
        """The method adding new project to the data storage.

        Args:
            data (ProjectBroker): The details of the new project.

        Returns:
            Review | None: Full details of the newly added project.
        """

    @abstractmethod
    async def update_project(
        self,
        project_id: int,
        data: ProjectBroker,
    ) -> Project | None:
        """The method updating project data in the data storage.

        Args:
            project_id (int): The id of the project.
            data (ReviewBroker): The details of the updated project.

        Returns:
            Project | None: The updated project details.
        """

    @abstractmethod
    async def get_projects_by_tags(
        self,
        name: str | None,
        tags: list[str],
        tag_match: str,
    ) -> Iterable[Project]:
        """The method getting projects filtered by tags.

        Args:
            name (str | None): The search phrase.
            tags (list[str]): The tags to filter by.
            tag_match (str): The matching mode (all/any).

        Returns:
            Iterable[Project]: The matching projects.
        """

    @abstractmethod
    async def delete_project(self, project_id: int) -> bool:
        """The method updating removing project from the data storage.

        Args:
            project_id (int): The id of the project.

        Returns:
            bool: Success of the operation.
        """