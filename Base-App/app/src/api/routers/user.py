"""A module containing user-related routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from src.container import Container
from src.core.domain.user import UserIn
from src.infrastructure.dto.tokendto import TokenDTO
from src.infrastructure.dto.userdto import UserDTO
from src.infrastructure.services.iuser import IUserService

router = APIRouter()


class ResendEmailRequest(BaseModel):
    """A model for resending activation email request."""
    email: str


@router.post("/register", response_model=UserDTO, status_code=201)
@inject
async def register_user(
        user: UserIn,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict | None:
    """A router coroutine for registering new user

    Args:
        user (UserIn): The user input data.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: The user DTO details.
    """

    try:
        if new_user := await service.register_user(user):
            return UserDTO(**dict(new_user)).model_dump()

        raise HTTPException(
            status_code=400,
            detail="The user with provided e-mail already exists",
        )
    except ValueError as e:
        print("Nieprawidłowe dane")


@router.post("/token", response_model=TokenDTO, status_code=200)
@inject
async def authenticate_user(
        user: UserIn,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for authenticating users.

    Args:
        user (UserIn): The user input data.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: The token DTO details.
    """

    if token_details := await service.authenticate_user(user):
        print("user confirmed")
        return token_details.model_dump()

    raise HTTPException(
        status_code=401,
        detail="Provided incorrect credentials",
    )


@router.get("/activate/{token}", status_code=302)
@inject
async def activate_user(
        token: str,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> RedirectResponse:
    """A router coroutine for activating user using token.

    Args:
        token (str): The activation token.
        service (IUserService, optional): The injected user service.

    Returns:
        RedirectResponse: Redirection to /activated/ or /expired/.
    """
    if await service.activate_user_with_token(token):
        return RedirectResponse(url="/activated/")
    return RedirectResponse(url="/expired/")


@router.post("/resend_activation_email/", status_code=200)
@inject
async def resend_activation_email(
        request: ResendEmailRequest,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for resending activation email.

    Args:
        request (ResendEmailRequest): The request containing user's email.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: Success message.
    """
    if await service.send_verification_email(request.email):
        return {"message": "Activation email sent"}

    raise HTTPException(
        status_code=400,
        detail="User not found or already verified",
    )