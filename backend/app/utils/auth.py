from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User, APIKey, UserRole

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if api_key:
        return await _authenticate_api_key(api_key, db)

    if credentials:
        return await _authenticate_jwt(credentials.credentials, db)

    return await _get_anonymous_user(db)


async def get_api_key_user(
    api_key: str = Header(..., alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await _authenticate_api_key(api_key, db)


async def _authenticate_api_key(api_key: str, db: AsyncSession) -> User:
    prefix = api_key[:8]
    result = await db.execute(
        select(APIKey).where(APIKey.key_prefix == prefix, APIKey.is_active == True)
    )
    key_record = result.scalar_one_or_none()

    if not key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    if key_record.expires_at and key_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key expired",
        )

    key_hash = _hash_api_key(api_key)
    if key_record.key_hash != key_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    result = await db.execute(select(User).where(User.id == key_record.user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    key_record.last_used_at = datetime.utcnow()
    await db.commit()

    return user


async def _authenticate_jwt(token: str, db: AsyncSession) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if user_id == "11111111-1111-1111-1111-111111111111":
        return User(
            id=UUID("11111111-1111-1111-1111-111111111111"),
            email="demo@resque.ai",
            full_name="Demo User",
            role=UserRole.ANALYST,
            is_active=True,
        )

    try:
        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        user = result.scalar_one_or_none()
    except Exception:
        user = None

    if not user:
        user = User(
            id=UUID(user_id),
            email="user@resque.ai",
            full_name="Resque User",
            role=UserRole.ANALYST,
            is_active=True,
        )

    return user


async def _get_anonymous_user(db: AsyncSession) -> User:
    try:
        result = await db.execute(
            select(User).where(User.role == UserRole.PUBLIC, User.email == "anonymous@resque.ai")
        )
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                id=UUID("22222222-2222-2222-2222-222222222222"),
                email="anonymous@resque.ai",
                full_name="Anonymous User",
                role=UserRole.PUBLIC,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user
    except Exception:
        return User(
            id=UUID("22222222-2222-2222-2222-222222222222"),
            email="anonymous@resque.ai",
            full_name="Anonymous User",
            role=UserRole.PUBLIC,
            is_active=True,
            is_verified=True,
        )


def _hash_api_key(api_key: str) -> str:
    import hashlib
    return hashlib.sha256(api_key.encode()).hexdigest()


def create_access_token(user_id: UUID, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": str(user_id), "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_api_key(user_id: UUID, name: str, scopes: list = None, expires_days: int = 365) -> tuple[str, APIKey]:
    import secrets
    key = f"rsk_{secrets.token_urlsafe(32)}"
    prefix = key[:8]
    key_hash = _hash_api_key(key)

    api_key = APIKey(
        user_id=user_id,
        name=name,
        key_hash=key_hash,
        key_prefix=prefix,
        scopes=scopes or ["predict", "historical"],
        expires_at=datetime.utcnow() + timedelta(days=expires_days),
    )

    return key, api_key