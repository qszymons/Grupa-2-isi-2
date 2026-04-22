"""A module containing tag-related routers."""

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4

from src.api.utils import get_current_user_uuid
from src.container import Container
from src.core.domain.tag import TagIn
from src.infrastructure.dto.tagdto import TagDTO
from src.infrastructure.services.itag import ITagService
from src.infrastructure.services.tag import TagConflictError

router = APIRouter()


@router.post("", response_model=TagDTO, status_code=201)
@inject
async def create_tag(
    tag: TagIn,
    _user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: ITagService = Depends(Provide[Container.tag_service]),
) -> dict:
    """
    Create a new tag.

    Args:
        tag (TagIn): The tag input data.
        _user_uuid (UUID4): The authenticated user's UUID.
        service (ITagService): The injected tag service.

    Returns:
        dict: The created tag details.
    """

    try:
        new_tag = await service.create_tag(tag)
    except TagConflictError:
        raise HTTPException(status_code=409, detail="Tag o podanej nazwie już istnieje")

    if new_tag:
        return TagDTO(**dict(new_tag)).model_dump()

    raise HTTPException(status_code=400, detail="Nie udało się utworzyć tagu")


@router.get("", response_model=list[TagDTO], status_code=200)
@inject
async def get_all_tags(
    service: ITagService = Depends(Provide[Container.tag_service]),
) -> list:
    """
    Retrieve all tags.

    Args:
        service (ITagService): The injected tag service.

    Returns:
        list: The list of all tags.
    """

    tags = await service.get_all()
    return [TagDTO(**dict(tag)).model_dump() for tag in tags]


@router.get("/{tag_id}", response_model=TagDTO, status_code=200)
@inject
async def get_tag_by_id(
    tag_id: int,
    service: ITagService = Depends(Provide[Container.tag_service]),
) -> dict:
    """
    Retrieve a tag by id.

    Args:
        tag_id (int): The id of the tag.
        service (ITagService): The injected tag service.

    Returns:
        dict: The retrieved tag details.
    """

    tag = await service.get_by_id(tag_id)

    if tag:
        return TagDTO(**dict(tag)).model_dump()

    raise HTTPException(status_code=404, detail="Nie odnaleziono tagu")


@router.put("/{tag_id}", response_model=TagDTO, status_code=200)
@inject
async def update_tag(
    tag_id: int,
    tag: TagIn,
    _user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: ITagService = Depends(Provide[Container.tag_service]),
) -> dict:
    """
    Update a tag name.

    Args:
        tag_id (int): The id of the tag to update.
        tag (TagIn): The new tag data.
        _user_uuid (UUID4): The authenticated user's UUID.
        service (ITagService): The injected tag service.

    Returns:
        dict: The updated tag details.
    """

    try:
        updated_tag = await service.update_tag(tag_id, tag)
    except TagConflictError:
        raise HTTPException(status_code=409, detail="Tag o podanej nazwie już istnieje")
    except LookupError:
        raise HTTPException(status_code=404, detail="Nie odnaleziono tagu")

    if updated_tag:
        return TagDTO(**dict(updated_tag)).model_dump()

    raise HTTPException(status_code=404, detail="Nie udało się zaktualizować tagu")


@router.delete("/{tag_id}", status_code=204)
@inject
async def delete_tag(
    tag_id: int,
    _user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: ITagService = Depends(Provide[Container.tag_service]),
) -> None:
    """
    Delete a tag.

    Args:
        tag_id (int): The id of the tag to delete.
        _user_uuid (UUID4): The authenticated user's UUID.
        service (ITagService): The injected tag service.

    Returns:
        None
    """

    try:
        deleted = await service.delete_tag(tag_id)
    except LookupError:
          raise HTTPException(status_code=404, detail="Nie odnaleziono tagu")

    if not deleted:
        raise HTTPException(status_code=404, detail="Nie udało się usunąć tagu")
