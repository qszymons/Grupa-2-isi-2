from dependency_injector.containers import DeclarativeContainer
from dependency_injector.providers import Singleton, Factory

from todolistapi.infrastructure.repositories.taskdb import TaskRepository

from todolistapi.infrastructure.services.task import TaskService

class Container(DeclarativeContainer):
    task_repository = Singleton(TaskRepository)

    task_service = Factory(
        TaskService,
        repository=task_repository,
    )