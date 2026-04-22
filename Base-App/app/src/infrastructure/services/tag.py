"""Module containing tag service implementation."""

from typing import Iterable

from src.core.domain.tag import Tag, TagIn
from src.core.repositories.iproject import IProjectRepository
from src.core.repositories.itag import ITagRepository
from src.infrastructure.services.itag import ITagService


class TagNotFoundError(LookupError):
    """Raised when a tag does not exist."""


class TagConflictError(ValueError):
    """Raised when a tag name conflicts with an existing tag."""


class ProjectNotFoundError(LookupError):
    """Raised when a project does not exist."""


class TagService(ITagService):
    """A class implementing the tag service."""

    _repository: ITagRepository
    _project_repository: IProjectRepository

    def __init__(
        self,
        repository: ITagRepository,
        project_repository: IProjectRepository,
    ) -> None:
        self._repository = repository
        self._project_repository = project_repository

    async def get_all(self) -> Iterable[Tag]:
        """
        Retrieve all tags.

        Returns:
            Iterable[Tag]: The retrieved tags.
        """

        return await self._repository.get_all()

    async def get_by_id(self, tag_id: int) -> Tag | None:
        """
        Retrieve a tag by id.

        Args:
            tag_id (int): The id of the tag.

        Returns:
            Tag | None: The retrieved tag details.
        """

        return await self._repository.get_by_id(tag_id)

    async def create_tag(self, data: TagIn) -> Tag | None:
        """
        Create a new tag, preserving global uniqueness.

        Args:
            data (TagIn): The new tag data.

        Returns:
            Tag | None: The newly created tag.
        """

        tag = await self._repository.add_tag(data)

        if tag is None:
            raise TagConflictError("Tag with this name already exists")

        return tag

    async def update_tag(self, tag_id: int, data: TagIn) -> Tag | None:
        """
        Update an existing tag.

        Args:
            tag_id (int): The id of the tag to update.
            data (TagIn): The updated tag data.

        Returns:
            Tag | None: The updated tag details.
        """

        if not await self._repository.get_by_id(tag_id):
            raise TagNotFoundError("Tag not found")

        updated_tag = await self._repository.update_tag(tag_id, data)

        if updated_tag is None:
            raise TagConflictError("Tag with this name already exists")

        return updated_tag

    async def delete_tag(self, tag_id: int) -> bool:
        """
        Delete a tag.

        Args:
            tag_id (int): The id of the tag to delete.

        Returns:
            bool: Success of the operation.
        """

        if not await self._repository.get_by_id(tag_id):
            raise TagNotFoundError("Tag not found")

        return await self._repository.delete_tag(tag_id)

    async def assign_tags(self, project_id: int, tag_ids: list[int]) -> Iterable[Tag]:
        """
        Replace project tags with the provided ids in an idempotent way.

        Args:
            project_id (int): The id of the project.
            tag_ids (list[int]): The list of tag ids to assign.

        Returns:
            Iterable[Tag]: The updated list of assigned tags.
        """

        if not await self._project_repository.get_by_id(project_id):
            raise ProjectNotFoundError("Project not found")

        unique_tag_ids = list(dict.fromkeys(tag_ids))

        for tag_id in unique_tag_ids:
            if not await self._repository.get_by_id(tag_id):
                raise TagNotFoundError(f"Tag {tag_id} not found")

        await self._repository.assign_tags(project_id, unique_tag_ids)

        return await self._repository.get_tags_by_project(project_id)

    async def unassign_tag(self, project_id: int, tag_id: int) -> None:
        """
        Unassign a tag from a project.

        Args:
            project_id (int): The id of the project.
            tag_id (int): The id of the tag to unassign.

        Returns:
            None
        """

        if not await self._project_repository.get_by_id(project_id):
            raise ProjectNotFoundError("Project not found")

        if not await self._repository.get_by_id(tag_id):
            raise TagNotFoundError("Tag not found")

        await self._repository.unassign_tag(project_id, tag_id)

    async def get_tags_by_project(self, project_id: int) -> Iterable[Tag]:
        """
        Retrieve all tags assigned to a project.

        Args:
            project_id (int): The id of the project.

        Returns:
            Iterable[Tag]: The list of assigned tags.
        """

        if not await self._project_repository.get_by_id(project_id):
            raise ProjectNotFoundError("Project not found")

        return await self._repository.get_tags_by_project(project_id)
