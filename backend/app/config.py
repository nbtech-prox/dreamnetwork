"""
Dream Network — Configuração central.
Carrega variáveis de ambiente com validação via Pydantic Settings.
"""

from __future__ import annotations

import logging
from typing import List

from pydantic_settings import BaseSettings
from pydantic import Field

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Configurações da aplicação lidas de variáveis de ambiente / .env."""

    # ── Banco relacional ────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://dreamuser:dream_pass_dev@localhost:5432/dreamnetwork",
        description="DSN de conexão ao PostgreSQL (asyncpg)",
    )

    # ── Neo4j ───────────────────────────────────────────────────────────
    neo4j_uri: str = Field(default="bolt://localhost:7687")
    neo4j_user: str = Field(default="neo4j")
    neo4j_password: str = Field(default="dream_neo4j_dev")

    # ── Redis ─────────────────────────────────────────────────────────
    redis_url: str = Field(default="redis://localhost:6379/0")

    # ── JWT / Auth ────────────────────────────────────────────────────
    secret_key: str = Field(default="super-secret-key-change-in-prod")
    jwt_expiry_hours: int = Field(default=24, ge=1, le=720)

    # ── CORS ──────────────────────────────────────────────────────────
    backend_cors_origins: List[str] = Field(
        default=["http://localhost:3000"],
        description="Origens CORS permitidas",
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "case_sensitive": False}


settings = Settings()
logger.info("Config loaded — DATABASE_URL=%s… NEO4J_URI=%s", settings.database_url[:50], settings.neo4j_uri)
