from abc import ABC, abstractmethod
from typing import Iterable
from todolistapi.core.domain.task import Task, TaskIn

class ITaskService(ABC):

    @abstractmethod
    async def get_all_tasks(self) -> Iterable[Task]:
        """The method getting all tasks"""

    @abstractmethod
    async def get_task_by_id(self, task_id: int) -> Task | None:
        """The method getting task by id"""

    @abstractmethod
    async def add_task(self, data: TaskIn) -> Task | None:
        """The method adding new task"""

    @abstractmethod
    async def delete_task(self, task_id: int) -> bool:
        """The method deleting task with given id"""