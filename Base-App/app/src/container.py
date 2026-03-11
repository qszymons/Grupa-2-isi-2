"""Module providing containers injecting dependencies."""

from dependency_injector.containers import DeclarativeContainer
from dependency_injector.providers import Factory, Singleton

from src.infrastructure.repositories.userdb import \
    UserRepository

from src.infrastructure.services.user import UserService


class Container(DeclarativeContainer):
    """Container class for dependency injecting purposes."""
    user_repository = Singleton(UserRepository)

    user_service = Factory(
        UserService,
        repository=user_repository
    )
