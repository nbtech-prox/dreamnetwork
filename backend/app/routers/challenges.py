"""
Dream Network — Router: desafios diários e gamificação.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/challenges", tags=["challenges"])


@router.get("")
async def get_challenges(
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Retorna o progresso do utilizador nos desafios diários.
    """
    try:
        today = datetime.now(timezone.utc).date()
        last_date = current_user.last_shared_date.date() if current_user.last_shared_date else None
        shared_today = last_date == today if last_date else False

        return {
            "points": current_user.points,
            "streak": current_user.streak,
            "shared_today": shared_today,
            "daily_challenge": {
                "title": "Escreva e partilhe um sonho hoje",
                "points": 10,
                "completed": shared_today,
            },
        }

    except Exception as exc:
        logger.error("Error getting challenges: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar desafios")


@router.post("/claim-daily")
async def claim_daily(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Reivindica os pontos do desafio diário.
    (Geralmente auto-atribuído ao partilhar, mas este endpoint permite
     reivindicar manualmente se o user já escreveu mas não partilhou.)
    """
    try:
        today = datetime.now(timezone.utc).date()
        last_date = current_user.last_shared_date.date() if current_user.last_shared_date else None

        if last_date == today:
            return {
                "points": current_user.points,
                "streak": current_user.streak,
                "message": "Desafio diário já completo hoje!",
            }

        # Mesmo sem partilha, dá 5 pontos só por escrever
        current_user.points += 5
        current_user.streak = (current_user.streak + 1) if (last_date and (today - last_date).days == 1) else 1
        current_user.last_shared_date = datetime.now(timezone.utc)
        await db.commit()

        logger.info("Daily claimed: user=%s points=%d streak=%d", current_user.username, current_user.points, current_user.streak)

        return {
            "points": current_user.points,
            "streak": current_user.streak,
            "message": "Desafio diário reivindicado! +5 pontos",
        }

    except Exception as exc:
        logger.error("Error claiming daily: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao reivindicar desafio")
