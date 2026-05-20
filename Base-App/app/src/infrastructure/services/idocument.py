"""Module containing document service abstractions."""

from abc import ABC, abstractmethod
from typing import Iterable
from uuid import UUID

from src.core.domain.document import Document


class IDocumentService(ABC):
    """A class representing a document service."""

    @abstractmethod
    async def create_document(
        self,
        project_id: int,
        filename: str,
        file_content: bytes,
        is_public: bool,
        user_id: str,
    ) -> Document:
        """Create a new document for a project.

        Args:
            project_id (int): The id of the parent project.
            filename (str): The original filename.
            file_content (bytes): The raw file content.
            is_public (bool): Whether the document is publicly visible.
            user_id (str): The UUID of the requesting user.

        Returns:
            Document: The created document details.
        """

    @abstractmethod
    async def get_document(
        self,
        public_id: UUID,
        user_id: str,
    ) -> Document | None:
        """Get a document by public UUID with access control.

        Args:
            public_id (UUID): The public UUID of the document.
            user_id (str): The UUID of the requesting user.

        Returns:
            Document | None: The document if accessible, None otherwise.
        """

    @abstractmethod
    async def get_project_documents(
        self,
        project_id: int,
        user_id: str,
    ) -> Iterable[Document]:
        """Get documents for a project with access control.

        Args:
            project_id (int): The id of the project.
            user_id (str): The UUID of the requesting user.

        Returns:
            Iterable[Document]: The visible documents.
        """

    @abstractmethod
    async def update_document(
        self,
        public_id: UUID,
        user_id: str,
        filename: str | None = None,
        file_content: bytes | None = None,
        name: str | None = None,
        is_public: bool | None = None,
    ) -> Document | None:
        """Update a document. Only project owner can update.

        Args:
            public_id (UUID): The public UUID of the document.
            user_id (str): The UUID of the requesting user.
            filename (str | None): New filename if re-uploading.
            file_content (bytes | None): New file content if re-uploading.
            name (str | None): New document name.
            is_public (bool | None): New visibility setting.

        Returns:
            Document | None: The updated document if authorized, None otherwise.
        """

    @abstractmethod
    async def delete_document(self, public_id: UUID, user_id: str) -> bool:
        """Delete a document. Only project owner can delete.

        Args:
            public_id (UUID): The public UUID of the document.
            user_id (str): The UUID of the requesting user.

        Returns:
            bool: True if deleted, False if not found or not authorized.
        """
