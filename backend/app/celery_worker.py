"""
Dream Network — Ponto de entrada do worker Celery.

Executar:
    celery -A app.celery_worker worker --loglevel=info
"""

from __future__ import annotations

from app.celery_app import celery_app

# Import garante que as tasks são registadas no worker
import app.tasks.neo4j_tasks  # noqa: F401

# A flag `-A app.celery_worker` procura por `app` ou `celery`
app = celery_app
