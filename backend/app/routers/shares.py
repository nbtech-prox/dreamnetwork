"""
Dream Network — Router: partilha anónima de metadados de sonhos.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from typing import ClassVar
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SharedDream, User
from app.auth import get_current_user, user_sha256
from app.tasks.neo4j_tasks import process_shared_dream_task

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/shares", tags=["shares"])


# ── Schemas ──────────────────────────────────────────────────────────────

class ShareCreate(BaseModel):
    """Payload para partilhar metadados de um sonho."""
    emotion: str
    timestamp: str  # ISO 8601

    VALID_EMOTIONS: ClassVar[set] = {"alegria", "medo", "tristeza", "raiva", "surpresa", "neutro"}

    @field_validator("emotion")
    @classmethod
    def validate_emotion(cls, v: str) -> str:
        v_lower = v.strip().lower()
        if v_lower not in cls.VALID_EMOTIONS:
            raise ValueError(f"Emoção inválida: {v}. Válidas: {', '.join(sorted(cls.VALID_EMOTIONS))}")
        return v_lower

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v)
        except (ValueError, TypeError):
            raise ValueError("timestamp deve estar no formato ISO 8601 (ex: 2025-05-09T20:00:00+00:00)")
        return v


class ShareOut(BaseModel):
    id: str
    emotion: str
    timestamp: str
    created_at: str

    model_config = {"from_attributes": True}


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_share(
    payload: ShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Recebe metadados anónimos de um sonho partilhado.
    NUNCA recebe o texto do sonho — apenas emoção, timestamp e user_hash.
    """
    try:
        user_hash = user_sha256(current_user.username)
        parsed_ts = datetime.fromisoformat(payload.timestamp)

        record = SharedDream(
            user_hash=user_hash,
            emotion=payload.emotion,
            timestamp=parsed_ts,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        # Atualiza pontos e streak no user
        today = datetime.now(timezone.utc).date()
        last_date = current_user.last_shared_date.date() if current_user.last_shared_date else None

        current_user.points += 10

        if last_date == today:
            # Já partilhou hoje — não aumenta streak
            pass
        elif last_date and (today - last_date).days == 1:
            # Dia consecutivo
            current_user.streak += 1
        elif last_date and (today - last_date).days > 1:
            # Quebrou a streak
            current_user.streak = 1
        else:
            # Primeira vez
            current_user.streak = 1

        current_user.last_shared_date = datetime.now(timezone.utc)
        await db.commit()

        # Envia tarefa para atualizar o grafo Neo4j (assíncrona)
        process_shared_dream_task.delay(
            str(record.id),
            payload.emotion,
            user_hash,
            payload.timestamp,
        )

        logger.info("Share created: id=%s emotion=%s user=%s", record.id, payload.emotion, current_user.username)

        return {
            "id": str(record.id),
            "emotion": record.emotion,
            "points": current_user.points,
            "streak": current_user.streak,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error creating share: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao partilhar sonho")


@router.get("")
async def list_shares(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    """Lista partilhas do user atual (útil para debug)."""
    try:
        user_hash = user_sha256(current_user.username)
        result = await db.execute(
            select(SharedDream)
            .where(SharedDream.user_hash == user_hash)
            .order_by(SharedDream.created_at.desc())
            .limit(min(limit, 200))
        )
        shares = result.scalars().all()
        return [
            {
                "id": str(s.id),
                "emotion": s.emotion,
                "timestamp": s.timestamp.isoformat(),
                "created_at": s.created_at.isoformat(),
            }
            for s in shares
        ]
    except Exception as exc:
        logger.error("Error listing shares: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar partilhas")
