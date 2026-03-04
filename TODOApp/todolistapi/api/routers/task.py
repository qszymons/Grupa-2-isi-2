from typing import Iterable

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException
from fastapi.openapi.models import HTTPBearer

from todolistapi.container import Container
from todolistapi.core.domain.task import Task, TaskIn
from todolistapi.infrastructure.services.itask import ITaskService

bearer_scheme = HTTPBearer()

router = APIRouter()

@router.get("/all", response_model=Iterable[Task], status_code=200)
@inject
async def get_all_tasks(
        service: ITaskService = Depends(Provide[Container.task_service]),
) -> Iterable:
    tasks = await service.get_all_tasks()
    return tasks


@router.get("/{task_id}", response_model=Task, status_code=200)
@inject
async def get_task_by_id(
        task_id: int,
        service: ITaskService = Depends(Provide[Container.task_service]),
) -> dict | None:
    if task := await service.get_task_by_id(task_id=task_id):
        return task.model_dump()
    raise HTTPException(status_code=404, detail="Task not found")


@router.post("/add", response_model=Task, status_code=201)
@inject
async def add_task(
        task: TaskIn,
        service: ITaskService = Depends(Provide[Container.task_service]),
) -> dict:
    new_task = await service.add_task(task)
    return new_task.model_dump() if new_task else {}


@router.delete("/{task_id}", status_code=204)
@inject
async def delete_task(
        task_id: int,
        service: ITaskService = Depends(Provide[Container.task_service]),
) -> None:
    if await service.get_task_by_id(task_id=task_id):
        await service.delete_task(task_id)

        return
    raise HTTPException(status_code=404, detail="Task not found")