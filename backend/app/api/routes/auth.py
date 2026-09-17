from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from backend.app.core.config import JWT_ACCESS_TOKEN_EXPIRE_MINUTES
from backend.app.schemas.auth import AccessToken
from backend.app.services.auth_service import (
    authenticate_admin,
    configuration_is_valid,
    create_access_token,
    get_current_admin,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/token", response_model=AccessToken)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> AccessToken:
    if not configuration_is_valid():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        )

    if not authenticate_admin(form_data.username, form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AccessToken(
        access_token=create_access_token(),
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me")
def get_current_admin_profile(
    username: Annotated[str, Depends(get_current_admin)],
) -> dict[str, str]:
    return {
        "username": username,
        "role": "admin",
    }