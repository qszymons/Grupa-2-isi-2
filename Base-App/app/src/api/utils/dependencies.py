"""A module containing API dependencies."""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordBearer

from src.container import Container
from src.infrastructure.dto.userdto import UserDTO
from src.infrastructure.services.iuser import IUserService
from src.infrastructure.utils.token import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

@inject
async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    access_token: str | None = Cookie(None),
    service: IUserService = Depends(Provide[Container.user_service]),
) -> UserDTO | None:
    """A dependency to optionally get the current user from a JWT token."""
    token_to_use = token or access_token

    if not token_to_use:
        return None

    try:
        payload = decode_token(token_to_use)
        if not payload or payload.get("type") != "access":
            return None
            
        user_uuid = payload.get("sub")
        if user_uuid is None:
            return None
            
        user = await service.get_by_uuid(user_uuid)
        return user
    except Exception:
        return None

@inject
async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    access_token: str | None = Cookie(None),
    service: IUserService = Depends(Provide[Container.user_service]),
) -> UserDTO:
    """A dependency to get the current user from a JWT token."""

    token_to_use = token or access_token

    if not token_to_use:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Brak uwierzytelnienia",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token_to_use)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nie udało się zweryfikować danych uwierzytelniających",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_uuid = payload.get("sub")

    if user_uuid is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nie udało się zweryfikować danych uwierzytelniających",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await service.get_by_uuid(user_uuid)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nie znaleziono użytkownika",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
