"""Module providing containers injecting dependencies."""

from dependency_injector.containers import DeclarativeContainer
from dependency_injector.providers import Factory, Singleton

from src.infrastructure.repositories.userdb import \
    UserRepository
from src.infrastructure.repositories.projectdb import \
    ProjectRepository

from src.infrastructure.services.user import UserService
from src.infrastructure.services.project import ProjectService


class Container(DeclarativeContainer):
    """Container class for dependency injecting purposes."""
    user_repository = Singleton(UserRepository)
    project_repository = Singleton(ProjectRepository)

    user_service = Factory(
        UserService,
        repository=user_repository
    )

    project_service = Factory(
        ProjectService,
        repository=project_repository
    )