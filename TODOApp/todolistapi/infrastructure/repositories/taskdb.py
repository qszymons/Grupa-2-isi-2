from typing import Any, Iterable
from asyncpg import Record # type: ignore
from sqlalchemy import select

from todolistapi.core.repositories.itask import ITaskRepository
from todolistapi.core.domain.task import Task, TaskIn

from todolistapi.db import (
database,
task_table
)

class TaskRepository(ITaskRepository):
    async def get_all_tasks(self) -> Iterable[Any]:
        query = (
            select(
                task_table.c.id,
                task_table.c.name,
            )
            .order_by(task_table.c.id)
        )
        tasks = await database.fetch_all(query)

        return [Task(**dict(task)) for task in tasks]

    async def get_task_by_id(self, task_id: int) -> Any | None:
        task = await self._get_by_id(task_id)
        return Task(**dict(task)) if task else None

    async def add_task(self, data: TaskIn) -> Any | None:
        query = task_table.insert().values(**data.model_dump())
        new_task_id = await database.execute(query)
        new_task = await self._get_by_id(new_task_id)

        return Task(**dict(new_task)) if new_task else None

    async def delete_task(self, task_id: int) -> bool:
        if self._get_by_id(task_id):
            query = task_table \
                .delete() \
                .where(task_table.c.id == task_id)

            await database.execute(query)
            return True
        return False

    async def _get_by_id(self, tag_id: int) -> Record | None:
        """A private method getting tag from the database based on its id

        Args:
            tag_id (int): The id of the tag

        Returns:
            Record | None: Tag record if it exists
        """
        query = (
            task_table.select()
            .where(task_table.c.id == tag_id)
            .order_by(task_table.c.id)
        )
        return await database.fetch_one(query)
