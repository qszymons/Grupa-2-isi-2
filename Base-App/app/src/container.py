"""Module providing containers injecting dependencies."""

from dependency_injector.containers import DeclarativeContainer
from dependency_injector.providers import Factory, Singleton

from src.infrastructure.repositories.userdb import \
    UserRepository
from src.infrastructure.repositories.projectdb import \
    ProjectRepository
from src.infrastructure.repositories.tagdb import \
    TagRepository
from src.infrastructure.repositories.documentdb import \
    DocumentRepository

from src.infrastructure.services.user import UserService
from src.infrastructure.services.project import ProjectService
from src.infrastructure.services.tag import TagService
from src.infrastructure.services.document import DocumentService


class Container(DeclarativeContainer):
    """Container class for dependency injecting purposes."""
    user_repository = Singleton(UserRepository)
    project_repository = Singleton(ProjectRepository)
    tag_repository = Singleton(TagRepository)
    document_repository = Singleton(DocumentRepository)

    user_service = Factory(
        UserService,
        repository=user_repository
    )

    project_service = Factory(
        ProjectService,
        repository=project_repository,
        tag_repository=tag_repository,
    )

    tag_service = Factory(
        TagService,
        repository=tag_repository,
        project_repository=project_repository,
    )

    document_service = Factory(
        DocumentService,
        repository=document_repository,
        project_repository=project_repository,
    )
