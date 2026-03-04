from typing import Iterable
from todolistapi.core.repositories.itask import ITaskRepository
from todolistapi.core.domain.task import TaskIn, Task
from todolistapi.infrastructure.services.itask import ITaskService

class TaskService(ITaskService):
    _repository: ITaskRepository

    def __init__(self, repository: ITaskRepository) -> None:
        self._repository = repository

    async def get_all_tasks(self) -> Iterable[Task]:
        return await self._repository.get_all_tasks()

    async def get_task_by_id(self, task_id: int) -> Task | None:
        return await self._repository.get_task_by_id(task_id)

    async def add_task(self, data: TaskIn) -> Task | None:
        return await self._repository.add_task(data)

    async def delete_task(self, task_id: int) -> bool:
        return await self._repository.delete_task(task_id)