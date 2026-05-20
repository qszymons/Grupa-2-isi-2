"""Module containing DB-backed task status tracking for async operations."""

import uuid
from enum import Enum

from src.db import database, embedding_tasks_table


class TaskStatus(str, Enum):
    """Status of an async embedding task."""

    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class EmbeddingTaskStore:
    """DB-backed store for tracking embedding task status.

    Shared between backend and worker via PostgreSQL.
    """

    async def create_task(
        self, document_id: int, model_name: str,
    ) -> str:
        """Create a new pending task in the database.

        Args:
            document_id: The document being processed.
            model_name: The embedding model to use.

        Returns:
            str: The generated task ID.
        """
        task_id = str(uuid.uuid4())
        await database.execute(
            embedding_tasks_table.insert().values(
                id=task_id,
                document_id=document_id,
                model_name=model_name,
                status=TaskStatus.PENDING,
                chunks_processed=0,
            )
        )
        return task_id

    async def get_task(self, task_id: str) -> dict | None:
        """Get task info by ID from the database.

        Args:
            task_id: The task ID.

        Returns:
            dict | None: Task info or None if not found.
        """
        row = await database.fetch_one(
            embedding_tasks_table.select().where(
                embedding_tasks_table.c.id == task_id
            )
        )
        if row is None:
            return None
        return dict(row)

    async def update_task(self, task_id: str, **kwargs: object) -> None:
        """Update task fields in the database.

        Args:
            task_id: The task ID.
            **kwargs: Fields to update (status, error, chunks_processed).
        """
        await database.execute(
            embedding_tasks_table.update()
            .where(embedding_tasks_table.c.id == task_id)
            .values(**kwargs)
        )

    async def get_pending_tasks(self) -> list[dict]:
        """Get all pending tasks (used by the worker).

        Returns:
            list[dict]: List of pending tasks.
        """
        rows = await database.fetch_all(
            embedding_tasks_table.select()
            .where(embedding_tasks_table.c.status == TaskStatus.PENDING)
            .order_by(embedding_tasks_table.c.created_at)
        )
        return [dict(r) for r in rows]

    async def claim_next_task(self) -> dict | None:
        """Atomically claim the next pending task.

        Returns:
            dict | None: The claimed task or None if no pending tasks.
        """
        import sqlalchemy

        oldest = (
            sqlalchemy.select(embedding_tasks_table.c.id)
            .where(embedding_tasks_table.c.status == TaskStatus.PENDING)
            .order_by(embedding_tasks_table.c.created_at)
            .limit(1)
            .scalar_subquery()
        )

        query = (
            embedding_tasks_table.update()
            .where(embedding_tasks_table.c.id == oldest)
            .values(status=TaskStatus.RUNNING)
            .returning(*embedding_tasks_table.columns)
        )

        row = await database.fetch_one(query)
        if row is None:
            return None
        return dict(row)
