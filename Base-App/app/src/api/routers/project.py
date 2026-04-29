"""A module containing project-related routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4

from src.api.utils import get_current_user_uuid
from src.container import Container
from src.core.domain.project import ProjectIn, ProjectBroker
from src.infrastructure.dto.projectdto import ProjectDTO
from src.infrastructure.services.iproject import IProjectService
from src.infrastructure.services.itag import ITagService
from src.infrastructure.dto.tagdto import TagDTO
from fastapi import Query

router = APIRouter()


@router.post("/project", response_model=ProjectDTO, status_code=201)
@inject
async def create_project(
    project: ProjectIn,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IProjectService = Depends(Provide[Container.project_service]),
) -> dict:
    """Create a new project for the authenticated user.

    Args:
        project (ProjectIn): The project input data.
        user_uuid (UUID4): The authenticated user's UUID.
        service (IProjectService): The injected project service.

    Returns:
        dict: The created project details.
    """

    user_projects = await service.get_project_by_user(str(user_uuid))
    if any(p.name == project.name for p in user_projects):
        raise HTTPException(
            status_code=400,
            detail="Posiadasz już projekt o takiej nazwie",
        )

    broker = ProjectBroker(
        name=project.name,
        data=project.data,
        user_id=user_uuid,
    )

    if new_project := await service.add_project(broker):
        return ProjectDTO(**dict(new_project)).model_dump()

    raise HTTPException(
        status_code=400,
        detail="Nie udało się utworzyć projektu",
    )


@router.put("/project/{project_id}", response_model=ProjectDTO, status_code=200)
@inject
async def update_project(
    project_id: int,
    project: ProjectIn,
    user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IProjectService = Depends(Provide[Container.project_service]),
) -> dict:
    """Update an existing project.

    Args:
        project_id (int): The id of the project to update.
        project (ProjectIn): The new project data.
        user_uuid (UUID4): The authenticated user's UUID.
        service (IProjectService): The injected project service.

    Returns:
        dict: The updated project details.
    """

    user_projects = await service.get_project_by_user(str(user_uuid))
    if any(p.name == project.name and p.id != project_id for p in user_projects):
        raise HTTPException(
            status_code=400,
            detail="Posiadasz już projekt o takiej nazwie",
        )

    broker = ProjectBroker(
        name=project.name,
        data=project.data,
        user_id=user_uuid,
    )

    if updated := await service.update_project(project_id, broker):
        return ProjectDTO(**dict(updated)).model_dump()

    raise HTTPException(
        status_code=404,
        detail="Nie odnaleziono projektu",
    )


@router.delete("/project/{project_id}", status_code=204)
@inject
async def delete_project(
    project_id: int,
    _user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: IProjectService = Depends(Provide[Container.project_service]),
) -> None:
    """Delete a project.

    Args:
        project_id (int): The id of the project to delete.
        _user_uuid (UUID4): The authenticated user's UUID (for auth check).
        service (IProjectService): The injected project service.
    """

    if not await service.delete_project(project_id):
        raise HTTPException(
            status_code=404,
            detail="Nie odnaleziono projektu",
        )


@router.get(
    "/project/user/{user_id}",
    response_model=list[ProjectDTO],
    status_code=200,
)
@inject
async def get_user_projects(
    user_id: UUID4,
    service: IProjectService = Depends(Provide[Container.project_service]),
) -> list:
    """Get all projects belonging to a user.

    Args:
        user_id (UUID4): The id of the user.
        service (IProjectService): The injected project service.

    Returns:
        list: The list of user's projects.
    """

    projects = await service.get_project_by_user(str(user_id))

    return [ProjectDTO(**dict(p)).model_dump() for p in projects]


@router.get(
    "/project/search",
    response_model=list[ProjectDTO],
    status_code=200,
)
@inject
async def search_projects(
    name: str,
    service: IProjectService = Depends(Provide[Container.project_service]),
) -> list:
    """Search projects by name using ILIKE matching.

    Args:
        name (str): The search phrase.
        service (IProjectService): The injected project service.

    Returns:
        list: The list of matching projects.
    """

    projects = await service.get_project_by_name(name)

    return [ProjectDTO(**dict(p)).model_dump() for p in projects]


@router.put("/project/{project_id}/tags", response_model=list[TagDTO], status_code=200)
@inject
async def assign_tags_to_project(
    project_id: int,
    tag_ids: list[int],
    _user_uuid: UUID4 = Depends(get_current_user_uuid),
    service: ITagService = Depends(Provide[Container.tag_service]),
) -> list:
    """Assign tags to a project.

    Args:
        project_id (int): The project id.
        tag_ids (list[int]): The list of tag ids.
        _user_uuid (UUID4): The authenticated user's UUID.
        service (ITagService): The injected tag service.

    Returns:
        list: The updated list of tags for the project.
    """

    try:
        tags = await service.assign_tags(project_id, tag_ids)
        return [TagDTO(**dict(t)).model_dump() for t in tags]
    except LookupError:
        raise HTTPException(status_code=404, detail="Nie można przypisać tagu")


@router.get(
    "/project/search/tags",
    response_model=list[ProjectDTO],
    status_code=200,
)
@inject
async def search_projects_by_tags(
    tags: list[str] = Query(default=[]),
    tag_match: str = Query(default="any"),
    name: str | None = None,
    service: IProjectService = Depends(Provide[Container.project_service]),
) -> list:
    """Search projects by tags and optionally name.

    Args:
        tags (list[str]): The tags to search by.
        tag_match (str): The matching mode (all/any).
        name (str | None): The search phrase.
        service (IProjectService): The injected project service.

    Returns:
        list: The list of matching projects.
    """

    projects = await service.get_projects_by_tags(name, tags, tag_match)
    return [ProjectDTO(**dict(p)).model_dump() for p in projects]
