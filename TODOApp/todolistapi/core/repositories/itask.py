from abc import ABC, abstractmethod
from typing import Any, Iterable

from todolistapi.core.domain.task import TaskIn

class ITaskRepository(ABC):

    @abstractmethod
    async def get_all_tasks(self) -> Iterable[Any]:
        """Abstract method getting all tasks"""

    @abstractmethod
    async def get_task_by_id(self, task_id: int) -> Any | None:
        """Abstract method getting task by id"""

    @abstractmethod
    async def add_task(self, data: TaskIn) -> Any | None:
        """Abstract method adding new task to the data storage"""

    @abstractmethod
    async def delete_task(self, task_id: int) -> bool:
        """Abstract method deleting task with given id from the data storage"""