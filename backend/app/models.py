"""
Dream Network — Modelos SQLAlchemy (PostgreSQL).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    points = Column(Integer, default=0, nullable=False)
    streak = Column(Integer, default=0, nullable=False)
    last_shared_date = Column(DateTime(timezone=True), nullable=True)  # usado p/ streak
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<User {self.username} points={self.points} streak={self.streak}>"


class SharedDream(Base):
    """Metadados anónimos de um sonho partilhado.

    Apenas emoção, timestamp e hash do user — NUNCA o texto do sonho.
    """

    __tablename__ = "shared_dreams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_hash = Column(String(64), nullable=False, index=True)
    emotion = Column(String(32), nullable=False)  # alegria|medo|tristeza|raiva|surpresa|neutro
    timestamp = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<SharedDream {self.emotion} @ {self.timestamp.isoformat()}>"
