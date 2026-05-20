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
from src.infrastructure.repositories.chunkdb import \
    ChunkRepository
from src.infrastructure.repositories.searchdb import \
    SemanticSearchRepository

from src.infrastructure.services.user import UserService
from src.infrastructure.services.project import ProjectService
from src.infrastructure.services.tag import TagService
from src.infrastructure.services.document import DocumentService
from src.infrastructure.services.chunk import ChunkService
from src.infrastructure.services.embedding import EmbeddingService
from src.infrastructure.services.search import SemanticSearchService


class Container(DeclarativeContainer):
    """Container class for dependency injecting purposes."""
    user_repository = Singleton(UserRepository)
    project_repository = Singleton(ProjectRepository)
    tag_repository = Singleton(TagRepository)
    document_repository = Singleton(DocumentRepository)
    chunk_repository = Singleton(ChunkRepository)
    search_repository = Singleton(SemanticSearchRepository)

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

    embedding_service = Singleton(
        EmbeddingService,
    )

    chunk_service = Factory(
        ChunkService,
        repository=chunk_repository,
        embedding_service=embedding_service,
    )

    document_service = Factory(
        DocumentService,
        repository=document_repository,
        project_repository=project_repository,
        chunk_service=chunk_service,
    )

    search_service = Factory(
        SemanticSearchService,
        project_repository=project_repository,
        search_repository=search_repository,
        embedding_service=embedding_service,
    )

