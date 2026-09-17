from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from backend.app.core.config import (
    ADMIN_PASSWORD_HASH,
    ADMIN_USERNAME,
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_SECRET,
)

password_hash = PasswordHash.recommended()
dummy_password_hash = password_hash.hash("sentinelai-not-a-real-password")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def configuration_is_valid() -> bool:
    return bool(ADMIN_USERNAME and ADMIN_PASSWORD_HASH and JWT_SECRET)


def authenticate_admin(username: str, password: str) -> bool:
    if not configuration_is_valid():
        return False

    if username != ADMIN_USERNAME:
        password_hash.verify(password, dummy_password_hash)
        return False

    return password_hash.verify(password, ADMIN_PASSWORD_HASH)


def create_access_token() -> str:
    if not configuration_is_valid():
        raise RuntimeError("Authentication is not configured.")

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {
            "sub": ADMIN_USERNAME,
            "role": "admin",
            "exp": expires_at,
        },
        JWT_SECRET,
        algorithm="HS256",
    )


def get_current_admin(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> str:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="A valid admin token is required.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not configuration_is_valid():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = payload.get("sub")
        role = payload.get("role")
    except InvalidTokenError as error:
        raise credentials_error from error

    if username != ADMIN_USERNAME or role != "admin":
        raise credentials_error

    return username