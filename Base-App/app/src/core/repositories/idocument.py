"""Module containing document repository abstractions."""

from abc import ABC, abstractmethod
from typing import Any, Iterable
from uuid import UUID

from src.core.domain.document import DocumentBroker


class IDocumentRepository(ABC):
    """An abstract class representing protocol of document repository."""

    @abstractmethod
    async def get_by_id(self, document_id: int) -> Any | None:
        """The abstract getting document by internal id.

        Args:
            document_id (int): The internal id of the document.

        Returns:
            Any | None: The matching document.
        """

    @abstractmethod
    async def get_by_public_id(self, public_id: UUID) -> Any | None:
        """The abstract getting document by public UUID.

        Args:
            public_id (UUID): The public UUID of the document.

        Returns:
            Any | None: The matching document.
        """

    @abstractmethod
    async def get_by_project(self, project_id: int) -> Iterable[Any]:
        """The abstract getting all documents for a project.

        Args:
            project_id (int): The id of the project.

        Returns:
            Iterable[Any]: The collection of project documents.
        """

    @abstractmethod
    async def get_public_by_project(self, project_id: int) -> Iterable[Any]:
        """The abstract getting public documents for a project.

        Args:
            project_id (int): The id of the project.

        Returns:
            Iterable[Any]: The collection of public project documents.
        """

    @abstractmethod
    async def add_document(self, data: DocumentBroker) -> Any | None:
        """The abstract adding new document to the data storage.

        Args:
            data (DocumentBroker): The attributes of the document.

        Returns:
            Any | None: The newly created document.
        """

    @abstractmethod
    async def update_document(
        self,
        document_id: int,
        values: dict,
    ) -> Any | None:
        """The abstract updating document data in the data storage.

        Args:
            document_id (int): The internal document id.
            values (dict): The fields to update.

        Returns:
            Any | None: The updated document.
        """

    @abstractmethod
    async def delete_document(self, document_id: int) -> bool:
        """The abstract removing document from the data storage.

        Args:
            document_id (int): The internal document id.

        Returns:
            bool: Success of the operation.
        """
