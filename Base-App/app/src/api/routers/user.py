"""A module containing user-related routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from src.container import Container
from src.core.domain.user import UserIn
from src.api.utils.dependecies import get_current_user
from src.infrastructure.dto.tokendto import TokenDTO
from src.infrastructure.dto.userdto import UserDTO
from src.infrastructure.services.iuser import IUserService

router = APIRouter()


class ResendEmailRequest(BaseModel):
    """A model for resending activation email request."""
    email: str


class PasswordResetRequest(BaseModel):
    """A model for requesting a password reset."""
    email: str


class ResetPassword(BaseModel):
    """A model for resetting user password."""
    new_password: str


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


@router.post("/request-password-reset/", status_code=200)
@inject
async def request_password_reset(
        request: PasswordResetRequest,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for requesting a password reset email.

    Args:
        request (PasswordResetRequest): The request containing user's email.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: Success message.
    """
    if await service.send_password_reset_email(request.email):
        return {"message": "Password reset email sent"}

    raise HTTPException(
        status_code=400,
        detail="User not found"
    )


@router.post("/reset-password/{token}", status_code=200)
@inject
async def reset_password(
        token: str,
        request: ResetPassword,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for resetting user password with a token.

    Args:
        token (str): The password reset token.
        request (ResetPasswordRequest): The request containing new password.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: Success message.
    """
    if await service.reset_password_with_token(token, request.new_password):
        return {"message": "Password has been reset successfully"}

    raise HTTPException(
        status_code=400,
        detail="Invalid or expired token"
    )

@router.delete("/delete/me", status_code=204)
@inject
async def delete_user_account(
    current_user: UserDTO = Depends(get_current_user),
    service: IUserService = Depends(Provide[Container.user_service]),
) -> None:
    """A router coroutine for deleting the current user's account.

    Args:
        current_user (UserDTO): The current authenticated user.
        service (IUserService, optional): The injected user service.

    Returns:
        None
    """
    if not await service.delete_user(current_user.id):
        raise HTTPException(status_code=400, detail="Could not delete user")