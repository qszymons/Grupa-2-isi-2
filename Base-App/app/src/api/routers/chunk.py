"""A module containing chunk-related routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import UUID4, BaseModel

from src.api.utils import get_current_user_uuid_optional, get_current_user_uuid
from src.container import Container
from src.infrastructure.dto.chunkdto import ChunkDTO
from src.infrastructure.services.idocument import IDocumentService
from src.infrastructure.services.ichunk import IChunkService
from src.infrastructure.services.iembedding import IEmbeddingService
from src.infrastructure.services.task_store import EmbeddingTaskStore, TaskStatus

router = APIRouter()

_task_store = EmbeddingTaskStore()


class RechunkRequest(BaseModel):
    """Request body for re-chunking a document."""

    strategy: str = "length"
    chunk_size: int = 150
    chunk_overlap: int = 0


class EmbeddingRequest(BaseModel):
    """Request body for generating embeddings. H-2: model_name required."""

    model_name: str


@router.get(
    "/documents/{public_id}/chunks",
    response_model=list[ChunkDTO],
    status_code=200,
)
@inject
async def get_document_chunks(
    public_id: UUID4,
    user_uuid: UUID4 | None = Depends(get_current_user_uuid_optional),
    document_service: IDocumentService = Depends(Provide[Container.document_service]),
    chunk_service: IChunkService = Depends(Provide[Container.chunk_service]),
) -> list:
    """Get all chunks for a document with access control.

    Access control is delegated to DocumentService.get_document()
    which checks ownership/is_public. If it returns None, the document
    is either not found or not accessible

    Args:
        public_id (UUID4): The public UUID of the document.
        user_uuid (UUID4 | None): The authenticated user's UUID or None.
        document_service (IDocumentService): The injected document service.
        chunk_service (IChunkService): The injected chunk service.

    Returns:
        list: The list of document chunks.
    """

    document = await document_service.get_document(
        public_id,
        str(user_uuid) if user_uuid else "",
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono dokumentu",
        )

    chunks = await chunk_service.get_chunks_for_document(document.id)

    return [ChunkDTO(**dict(c)).model_dump() for c in chunks]


@router.post(
    "/documents/{public_id}/rechunk",
    response_model=list[ChunkDTO],
    status_code=200,
)
@inject
async def rechunk_document(
    public_id: UUID4,
    body: RechunkRequest,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    document_service: IDocumentService = Depends(Provide[Container.document_service]),
    chunk_service: IChunkService = Depends(Provide[Container.chunk_service]),
) -> list:
    """Re-chunk a document with a chosen strategy.

    Args:
        public_id (UUID4): The public UUID of the document.
        body (RechunkRequest): Strategy and parameters.
        user_uuid (UUID4): The authenticated user's UUID.
        document_service (IDocumentService): The injected document service.
        chunk_service (IChunkService): The injected chunk service.

    Returns:
        list: The new list of document chunks.
    """

    document = await document_service.get_document(
        public_id,
        str(user_uuid),
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono dokumentu",
        )

    try:
        chunks = await chunk_service.rechunk_document(
            document_id=document.id,
            text=document.data,
            chunk_size=body.chunk_size,
            chunk_overlap=body.chunk_overlap,
            strategy=body.strategy,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Błąd podczas chunkowania: {e}",
        )

    return [ChunkDTO(**dict(c)).model_dump() for c in chunks]


@router.post(
    "/documents/{public_id}/embed",
    status_code=202,
)
@inject
async def generate_document_embeddings(
    public_id: UUID4,
    body: EmbeddingRequest,
    background_tasks: BackgroundTasks,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    document_service: IDocumentService = Depends(Provide[Container.document_service]),
    chunk_service: IChunkService = Depends(Provide[Container.chunk_service]),
    embedding_service: IEmbeddingService = Depends(
        Provide[Container.embedding_service]
    ),
) -> dict:
    """Start async embedding generation for a document's chunks.

    Args:
        public_id (UUID4): The public UUID of the document.
        body (EmbeddingRequest): The embedding model to use.
        background_tasks (BackgroundTasks): FastAPI background tasks.
        user_uuid (UUID4): The authenticated user's UUID.
        document_service (IDocumentService): The injected document service.
        chunk_service (IChunkService): The injected chunk service.
        embedding_service (IEmbeddingService): The injected embedding service.

    Returns:
        dict: Task ID and status.
    """

    if not embedding_service.validate_model_name(body.model_name):
        raise HTTPException(
            status_code=400,
            detail=f"Nieznany model embeddingów: '{body.model_name}'",
        )

    document = await document_service.get_document(
        public_id,
        str(user_uuid),
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono dokumentu",
        )

    task_id = _task_store.create_task(document.id, body.model_name)

    async def _run_embedding() -> None:
        _task_store.update_task(task_id, status=TaskStatus.RUNNING)
        try:
            count = await chunk_service.generate_embeddings(
                document.id, body.model_name,
            )
            _task_store.update_task(
                task_id,
                status=TaskStatus.DONE,
                chunks_processed=count,
            )
        except Exception as e:
            _task_store.update_task(
                task_id,
                status=TaskStatus.FAILED,
                error=str(e),
            )

    background_tasks.add_task(_run_embedding)

    return {"task_id": task_id, "status": "pending"}


@router.get(
    "/embedding/task/{task_id}",
    status_code=200,
)
async def get_embedding_task_status(task_id: str) -> dict:
    """Get status of an async embedding generation task.

    Args:
        task_id (str): The task ID returned from POST /embed.

    Returns:
        dict: Task status and metadata.
    """
    task = _task_store.get_task(task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono zadania",
        )

    return task
