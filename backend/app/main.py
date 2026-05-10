"""
Dream Network — Aplicação FastAPI principal.

Inclui:
- CORS configurável
- Autenticação (registo / login / logout / me)
- Routers: shares, graph, challenges
- Healthcheck
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import init_db, get_db
from app.models import User
from app.auth import (
    hash_password,
    verify_password,
    create_jwt,
    get_current_user,
)
from app.routers import shares, graph, challenges
from app.routers.graph import close_neo4j

# ── Logging ──────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifecycle ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Dream Network API…")
    await init_db()
    yield
    logger.info("Shutting down Dream Network API…")
    await close_neo4j()


# ── App ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Dream Network API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = settings.backend_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if isinstance(origins, list) else [origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(shares.router)
app.include_router(graph.router)
app.include_router(challenges.router)


# ── Schemas de Auth ──────────────────────────────────────────────────────

class AuthRegister(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 64:
            raise ValueError("Username deve ter entre 3 e 64 caracteres")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Senha deve ter pelo menos 6 caracteres")
        return v


class AuthLogin(BaseModel):
    username: str
    password: str


class AuthOut(BaseModel):
    id: str
    username: str
    points: int
    streak: int
    token: str


# ── Endpoints de Auth ────────────────────────────────────────────────────

@app.post("/api/auth/register", status_code=201)
async def register(payload: AuthRegister, db: AsyncSession = Depends(get_db)) -> dict:
    """Regista um novo utilizador anónimo."""
    try:
        username = payload.username.strip()
        # Verifica duplicados
        result = await db.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username já existe")

        user = User(
            username=username,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        token = create_jwt(str(user.id), user.username)

        logger.info("User registered: id=%s username=%s", user.id, user.username)

        return {
            "id": str(user.id),
            "username": user.username,
            "points": user.points,
            "streak": user.streak,
            "token": token,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Registration error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao registar")


@app.post("/api/auth/login")
async def login(payload: AuthLogin, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    """Autentica e define cookie httpOnly __session."""
    try:
        username = payload.username.strip()
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

        token = create_jwt(str(user.id), user.username)

        # Cookie httpOnly (não acessível por JS)
        response.set_cookie(
            key="__session",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=settings.jwt_expiry_hours * 3600,
            path="/",
        )

        logger.info("User logged in: %s", user.username)

        return {
            "id": str(user.id),
            "username": user.username,
            "points": user.points,
            "streak": user.streak,
            "token": token,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Login error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao autenticar")


@app.post("/api/auth/logout")
async def logout(response: Response) -> dict:
    """Remove o cookie de sessão."""
    response.delete_cookie("__session", path="/")
    return {"message": "Sessão terminada"}


@app.get("/api/auth/me")
async def me(current_user: User = Depends(get_current_user)) -> dict:
    """Retorna os dados do utilizador autenticado."""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "points": current_user.points,
        "streak": current_user.streak,
        "last_shared_date": current_user.last_shared_date.isoformat() if current_user.last_shared_date else None,
    }


# ── Healthcheck ──────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Redireciona para a documentação da API."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
