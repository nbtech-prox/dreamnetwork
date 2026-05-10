"""
Dream Network — Conexão assíncrona com PostgreSQL via SQLAlchemy 2.0.

O engine é criado com lazy-init para permitir importações seguras
por ferramentas como Alembic sem disparar conexões prematuras.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# Engine e session factory são lazy — criados apenas quando necessário
_engine = None
_async_session_maker = None


def get_engine():
    """Retorna o engine assíncrono (cria se necessário)."""
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            pool_size=5,
            max_overflow=10,
            echo=False,
        )
        logger.debug("Async engine created: %s…", settings.database_url[:50])
    return _engine


def get_session_maker():
    """Retorna o session factory (cria se necessário)."""
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_maker


class Base(DeclarativeBase):
    """Classe base declarativa para todos os modelos SQLAlchemy."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency do FastAPI que fornece uma sessão assíncrona."""
    maker = get_session_maker()
    async with maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Cria todas as tabelas (útil em dev; em prod usar Alembic)."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created (if not existed).")
