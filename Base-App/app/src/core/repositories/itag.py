"""Module containing tag repository abstractions."""

from abc import ABC, abstractmethod
from typing import Any, Iterable

from src.core.domain.tag import TagIn


class ITagRepository(ABC):
    """An abstract class representing protocol of tag repository."""

    @abstractmethod
    async def get_all(self) -> Iterable[Any]:
        """Get all tags from the data storage."""

    @abstractmethod
    async def get_by_id(self, tag_id: int) -> Any | None:
        """Get a tag by id from the data storage."""

    @abstractmethod
    async def get_by_name(self, name: str) -> Any | None:
        """Get a tag by name from the data storage."""

    @abstractmethod
    async def add_tag(self, data: TagIn) -> Any | None:
        """Add a new tag to the data storage."""

    @abstractmethod
    async def update_tag(self, tag_id: int, data: TagIn) -> Any | None:
        """Update a tag in the data storage."""

    @abstractmethod
    async def delete_tag(self, tag_id: int) -> bool:
        """Delete a tag from the data storage."""

    @abstractmethod
    async def assign_tags(self, project_id: int, tag_ids: list[int]) -> None:
        """Replace project tags with the provided set."""

    @abstractmethod
    async def unassign_tag(self, project_id: int, tag_id: int) -> None:
        """Unassign a tag from a project."""

    @abstractmethod
    async def get_tags_by_project(self, project_id: int) -> Iterable[Any]:
        """Get all tags assigned to a project."""
