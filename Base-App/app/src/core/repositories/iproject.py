"""Module containing project repository abstractions."""

from abc import ABC, abstractmethod
from typing import Any, Iterable

from src.core.domain.project import Project, ProjectIn


class IProjectRepository(ABC):
    """An abstract class representing protocol of project repository."""

    @abstractmethod
    async def get_by_id(self, project_id: int) -> Any | None:
        """The abstract getting project by id from the data storage.

        Args:
            project_id (int): The id of the project.

        Returns:
            Any | None: The matching project.
        """

    @abstractmethod
    async def get_by_user(self, user_id: str) -> Iterable[Any]:
        """The abstract getting all provided user's project from the data storage.

        Args:
            user_id (int): The id of the user.

        Returns:
            Iterable[Any]: The collection of the projects.
        """

    @abstractmethod
    async def get_by_name(self, phrase: str) -> Iterable[Any]:
        """The abstract getting provided by name.

            Args:
                phrase (str): The phrase of the project.

            Returns:
                Iterable[Any]: The matching name project from the data.
        """

    @abstractmethod
    async def get_projects_by_tags(
        self,
        name: str | None,
        tags: list[str],
        tag_match: str,
    ) -> Iterable[Any]:
        """The abstract getting projects filtered by name and tags.

        Args:
            name (str | None): The project name phrase.
            tags (list[str]): The tag names used for filtering.
            tag_match (str): The filtering mode, either all or any.

        Returns:
            Iterable[Any]: The matching projects.
        """
    
    @abstractmethod
    async def add_project(self, data: ProjectIn) -> Any | None:
        """The abstract adding new project to the data storage.

        Args:
            data (Project): The attributes of the project.

        Returns:
            Any | None: The newly created project.
        """

    @abstractmethod
    async def update_project(
            self,
            project_id: int,
            data: ProjectIn,
    ) -> Any | None:
        """The abstract updating project data in the data storage.

        Args:
            project_id (int): The project id.
            data (ProjectIn): The attributes of the project.

        Returns:
            Any | None: The updated project.
        """

    @abstractmethod
    async def delete_project(self, project_id: int) -> bool:
        """The abstract updating removing project from the data storage.

        Args:
            project_id (int): The project id.

        Returns:
            bool: Success of the operation.
        """

