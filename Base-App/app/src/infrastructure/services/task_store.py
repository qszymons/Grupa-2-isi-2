"""Module containing in-memory task status tracking for async operations."""

import uuid
from enum import Enum


class TaskStatus(str, Enum):
    """Status of an async embedding task."""

    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class EmbeddingTaskStore:
    """Simple in-memory store for tracking embedding task status.

    """

    _tasks: dict[str, dict]

    def __init__(self) -> None:
        self._tasks = {}

    def create_task(
        self, document_id: int, model_name: str,
    ) -> str:
        """Create a new pending task.

        Args:
            document_id: The document being processed.
            model_name: The embedding model to use.

        Returns:
            str: The generated task ID.
        """
        task_id = str(uuid.uuid4())
        self._tasks[task_id] = {
            "status": TaskStatus.PENDING,
            "document_id": document_id,
            "model_name": model_name,
            "error": None,
            "chunks_processed": 0,
        }
        return task_id

    def get_task(self, task_id: str) -> dict | None:
        """Get task info by ID.

        Args:
            task_id: The task ID.

        Returns:
            dict | None: Task info or None if not found.
        """
        return self._tasks.get(task_id)

    def update_task(self, task_id: str, **kwargs: object) -> None:
        """Update task fields.

        Args:
            task_id: The task ID.
            **kwargs: Fields to update.
        """

        if task_id in self._tasks:
            self._tasks[task_id].update(kwargs)
