"""Module containing tag service abstractions."""

from abc import ABC, abstractmethod
from typing import Iterable

from src.core.domain.tag import Tag, TagIn


class ITagService(ABC):
    """A class representing a tag service."""

    @abstractmethod
    async def get_all(self) -> Iterable[Tag]:
        """Get all tags."""

    @abstractmethod
    async def get_by_id(self, tag_id: int) -> Tag | None:
        """Get a tag by id."""

    @abstractmethod
    async def create_tag(self, data: TagIn) -> Tag | None:
        """Create a tag."""

    @abstractmethod
    async def update_tag(self, tag_id: int, data: TagIn) -> Tag | None:
        """Update a tag."""

    @abstractmethod
    async def delete_tag(self, tag_id: int) -> bool:
        """Delete a tag."""

    @abstractmethod
    async def assign_tags(self, project_id: int, tag_ids: list[int]) -> Iterable[Tag]:
        """Assign tags to a project."""

    @abstractmethod
    async def unassign_tag(self, project_id: int, tag_id: int) -> None:
        """Unassign a tag from a project."""

    @abstractmethod
    async def get_tags_by_project(self, project_id: int) -> Iterable[Tag]:
        """Get all tags assigned to a project."""
