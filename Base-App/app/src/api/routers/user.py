"""A module containing user-related routers."""

from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, UploadFile, File
from fastapi.responses import FileResponse
import os
from pydantic import BaseModel

from src.container import Container
from src.core.domain.user import UserIn, UserLogin, ChangeUsernameRequest
from src.api.utils.dependecies import get_current_user
from src.infrastructure.dto.userdto import UserDTO
from src.infrastructure.services.iuser import IUserService
from src.infrastructure.utils.token import decode_token

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


class ChangePasswordRequest(BaseModel):
    """A model for changing user password."""
    old_password: str
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
            detail="Użytkownik z podanym adresem e-mail już istnieje",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
        )


@router.post("/token", status_code=200)
@inject
async def authenticate_user(
        user: UserLogin,
        response: Response,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for authenticating users.

    Args:
        user (UserLogin): The user input data.
        response (Response): Response used to set cookie data.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: The token DTO details.
    """

    user_data = await service.get_by_email(user.login)
    if not user_data:
        user_data = await service.get_by_username(user.login)

    if user_data and not user_data.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Konto nie zostało aktywowane. Sprawdź swój email.",
        )

    if token_details := await service.authenticate_user(user):
        print("user confirmed")
        response.set_cookie(key="access_token", value=token_details.access_token, httponly=True, secure=True,
                            samesite="lax")
        response.set_cookie(key="refresh_token", value=token_details.refresh_token, httponly=True, secure=True,
                            samesite="lax")
        return {"message": "Logged in successfully"}

    raise HTTPException(
        status_code=401,
        detail="Podano nieprawidłowe dane logowania",
    )


@router.post("/logout", status_code=200)
async def logout(
        response: Response
) -> dict:
    """A router coroutine for logging out users.

    Args:
        response (Response): Response used to set cookie data.

    Returns:
        dict: Message with success of the operation.
    """
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.post("/refresh", status_code=200)
@inject
async def refresh_token(
        response: Response,
        re_token: str | None = Cookie(None, alias="refresh_token"),
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for refreshing access tokens.

    Args:
        response (Response): Response used to set cookie data.
        re_token (str | None = Cookie(None)): The refresh token with a cookie parameter
        service (IUserService, optional): The injected user service.

    """
    if not re_token:
        raise HTTPException(status_code=401, detail="Brak tokenu odświeżania")

    if new_tokens := await service.refresh_access_token(re_token):
        response.set_cookie(key="access_token", value=new_tokens.access_token, httponly=True, secure=True,
                            samesite="lax")
        response.set_cookie(key="refresh_token", value=new_tokens.refresh_token, httponly=True, secure=True,
                            samesite="lax")
        return {"message": "Token refreshed successfully"}

    raise HTTPException(status_code=401, detail="Nieprawidłowy token odświeżania")


@router.get("/check-auth", status_code=200)
async def check_auth(
        access_token: str | None = Cookie(None),
) -> dict:
    """A router coroutine for checking if user is authenticated.

    Args:
        access_token (str | None = Cookie(None)): The access token with a cookie parameter

    Returns:
        dict: Message with success of the operation.
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="Brak tokenu dostępu")

    decoded = decode_token(access_token)
    if not decoded or decoded.get("type") != "access":
        raise HTTPException(status_code=401, detail="Nieprawidłowy token dostępu")

    return {"message": "Authenticated"}


@router.get("/me", response_model=UserDTO, status_code=200)
async def get_current_user_profile(
        current_user: UserDTO = Depends(get_current_user),
) -> dict:
    """A router coroutine for getting the current authenticated user.

    Args:
        current_user (UserDTO): The current authenticated user.

    Returns:
        dict: The user DTO details.
    """
    return UserDTO(**dict(current_user)).model_dump()


@router.get("/activate/{token}", status_code=200)
@inject
async def activate_user(
        token: str,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for activating user using token.

    Args:
        token (str): The activation token.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: Success message.
    """
    if await service.activate_user_with_token(token):
        return {"message": "Account activated successfully"}

    raise HTTPException(status_code=400, detail="Nieprawidłowy lub wygasły token")


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
        detail="Nie znaleziono użytkownika lub został już zweryfikowany",
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
        detail="Nie znaleziono użytkownika",
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
        detail="Nieprawidłowy lub wygasły token",
    )


@router.post("/change-password", status_code=200)
@inject
async def change_password(
        request: ChangePasswordRequest,
        current_user: UserDTO = Depends(get_current_user),
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for changing the current user's password.

    Args:
        request (ChangePasswordRequest): The request containing old and new passwords.
        current_user (UserDTO): The current authenticated user.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: Success message.
    """
    if await service.change_password(current_user.email, request.old_password, request.new_password):
        return {"message": "Password changed successfully"}

    raise HTTPException(status_code=400, detail="Nie udało się zmienić hasła")


@router.patch("/change-username", response_model=UserDTO, status_code=200)
@inject
async def change_username(
        request: ChangeUsernameRequest,
        current_user: UserDTO = Depends(get_current_user),
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for changing the current user's username.

    Args:
        request (ChangeUsernameRequest): The request containing new username.
        current_user (UserDTO): The current authenticated user.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: The updated user DTO.
    """
    try:
        # Pydantic validates on init, but if someone bypassed it or we do it manual:
        pass
    except ValueError as e:
         raise HTTPException(status_code=422, detail=str(e))

    # Check if username is taken
    existing_user = await service.get_by_username(request.new_username)
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(status_code=400, detail="Wybrana nazwa użytkownika jest już zajęta.")

    updated_user = await service.update_username(current_user.id, request.new_username)
    if updated_user:
        return UserDTO(**dict(updated_user)).model_dump()

    raise HTTPException(status_code=400, detail="Nie udało się zmienić nazwy użytkownika.")


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
        raise HTTPException(status_code=400, detail="Nie udało się usunąć użytkownika")


@router.post("/avatar", response_model=UserDTO, status_code=200)
@inject
async def upload_avatar(
        file: UploadFile = File(...),
        current_user: UserDTO = Depends(get_current_user),
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict | None:
    """A router coroutine for uploading user avatar.

    Args:
        file (UploadFile): The avatar image file.
        current_user (UserDTO): The current authenticated user.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: The user DTO details.
    """
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Przesłany plik musi być w formacie .jpg lub .png"
        )
        
    if updated_user := await service.update_avatar(current_user.id, file):
        return updated_user.model_dump()
        
    raise HTTPException(status_code=400, detail="Nie udało się zaktualizować awatara")


@router.get("/avatar/{uuid}", status_code=200)
async def get_avatar(uuid: str) -> FileResponse:
    """A router coroutine for retrieving a user's avatar.

    Args:
        uuid (str): The UUID of the user.

    Returns:
        FileResponse: The avatar image file.
    """
    base_path = os.path.join("src", "uploads", "avatars", uuid)
    
    if os.path.exists(f"{base_path}.png"):
        return FileResponse(f"{base_path}.png")

    if os.path.exists(f"{base_path}.jpg"):
        return FileResponse(f"{base_path}.jpg")

    if os.path.exists(f"{base_path}.jpeg"):
        return FileResponse(f"{base_path}.jpeg")
        
    raise HTTPException(status_code=404, detail="Nie znaleziono obrazu")


@router.get("/user/{uuid}/public", status_code=200)
@inject
async def get_public_user(
        uuid: str,
        service: IUserService = Depends(Provide[Container.user_service]),
) -> dict:
    """A router coroutine for retrieving a user's public info.

    Args:
        uuid (str): The UUID of the user.
        service (IUserService, optional): The injected user service.

    Returns:
        dict: The user's public details.
    """
    user = await service.get_by_uuid(uuid)
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

    has_image = False
    base_path = os.path.join("src", "uploads", "avatars", uuid)
    if os.path.exists(f"{base_path}.png") or os.path.exists(f"{base_path}.jpg") or os.path.exists(f"{base_path}.jpeg"):
        has_image = True

    return {
        "username": user.username,
        "has_image": has_image
    }