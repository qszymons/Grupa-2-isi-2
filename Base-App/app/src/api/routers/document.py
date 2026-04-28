"""A module containing document-related routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import UUID4

from src.api.utils import get_current_user_uuid
from src.container import Container
from src.infrastructure.dto.documentdto import DocumentDTO
from src.infrastructure.services.idocument import IDocumentService
from src.infrastructure.services.document import InvalidFileFormatError

router = APIRouter()


@router.post(
    "/project/{project_id}/documents",
    response_model=DocumentDTO,
    status_code=201,
)
@inject
async def create_document(
    project_id: int,
    file: UploadFile = File(...),
    is_public: bool = Form(False),
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IDocumentService = Depends(Provide[Container.document_service]),
) -> dict:
    """Create a new document for the given project.

    Args:
        project_id (int): The id of the parent project.
        file (UploadFile): The uploaded file (PDF or TXT).
        is_public (bool): Whether the document is publicly visible.
        user_uuid (UUID4): The authenticated user's UUID.
        service (IDocumentService): The injected document service.

    Returns:
        dict: The created document details.
    """

    file_content = await file.read()

    try:
        document = await service.create_document(
            project_id=project_id,
            filename=file.filename or "unnamed",
            file_content=file_content,
            is_public=is_public,
            user_id=str(user_uuid),
        )
    except InvalidFileFormatError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except LookupError:
        raise HTTPException(status_code=404, detail="Nie odnaleziono projektu")

    return DocumentDTO(**dict(document)).model_dump()


@router.get(
    "/project/{project_id}/documents",
    response_model=list[DocumentDTO],
    status_code=200,
)
@inject
async def get_project_documents(
    project_id: int,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IDocumentService = Depends(Provide[Container.document_service]),
) -> list:
    """Get all documents for a project with access control.

    Owner sees all documents. Non-owner sees only public documents.

    Args:
        project_id (int): The id of the project.
        user_uuid (UUID4): The authenticated user's UUID.
        service (IDocumentService): The injected document service.

    Returns:
        list: The list of visible documents.
    """

    documents = await service.get_project_documents(project_id, str(user_uuid))

    return [DocumentDTO(**dict(d)).model_dump() for d in documents]


@router.get(
    "/documents/{public_id}",
    response_model=DocumentDTO,
    status_code=200,
)
@inject
async def get_document(
    public_id: UUID4,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IDocumentService = Depends(Provide[Container.document_service]),
) -> dict:
    """Get a document by public UUID with access control.

    Owner of the parent project always sees the document.
    Non-owner sees it only when is_public is true.
    Otherwise returns 404 (resource masking).

    Args:
        public_id (UUID4): The public UUID of the document.
        user_uuid (UUID4): The authenticated user's UUID.
        service (IDocumentService): The injected document service.

    Returns:
        dict: The document details.
    """

    document = await service.get_document(public_id, str(user_uuid))

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono dokumentu",
        )

    return DocumentDTO(**dict(document)).model_dump()


@router.put(
    "/documents/{public_id}",
    response_model=DocumentDTO,
    status_code=200,
)
@inject
async def update_document(
    public_id: UUID4,
    file: UploadFile | None = File(None),
    name: str | None = Form(None),
    is_public: bool | None = Form(None),
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IDocumentService = Depends(Provide[Container.document_service]),
) -> dict:
    """Update an existing document by public UUID.

    Only the project owner can update. Non-owner receives 404.
    Supports partial update of name, is_public, and optional file re-upload.
    project_id cannot be changed.

    Args:
        public_id (UUID4): The public UUID of the document to update.
        file (UploadFile | None): Optional new file to upload.
        name (str | None): Optional new document name.
        is_public (bool | None): Optional new visibility setting.
        user_uuid (UUID4): The authenticated user's UUID.
        service (IDocumentService): The injected document service.

    Returns:
        dict: The updated document details.
    """

    file_content = None
    filename = None

    if file is not None:
        file_content = await file.read()
        filename = file.filename

    try:
        updated = await service.update_document(
            public_id=public_id,
            user_id=str(user_uuid),
            filename=filename,
            file_content=file_content,
            name=name,
            is_public=is_public,
        )
    except InvalidFileFormatError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono dokumentu",
        )

    return DocumentDTO(**dict(updated)).model_dump()


@router.delete("/documents/{public_id}", status_code=204)
@inject
async def delete_document(
    public_id: UUID4,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IDocumentService = Depends(Provide[Container.document_service]),
) -> None:
    """Delete a document by public UUID.

    Only the project owner can delete. Non-owner receives 404.

    Args:
        public_id (UUID4): The public UUID of the document to delete.
        user_uuid (UUID4): The authenticated user's UUID.
        service (IDocumentService): The injected document service.
    """

    if not await service.delete_document(public_id, str(user_uuid)):
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono dokumentu",
        )
