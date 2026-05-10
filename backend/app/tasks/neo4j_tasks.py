"""
Dream Network — Tasks Celery para o grafo Neo4j.
"""

from __future__ import annotations

import asyncio
import logging

from celery import Task
from celery.exceptions import MaxRetriesExceededError
from neo4j import AsyncGraphDatabase

from app.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)


class Neo4jTask(Task):
    """Task base com suporte a retry."""
    pass


@celery_app.task(
    base=Neo4jTask,
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def process_shared_dream_task(
    self,
    dream_id: str,
    emotion: str,
    user_hash: str,
    timestamp_iso: str,
) -> dict:
    """
    Worker Celery: processa um novo metadado partilhado e atualiza o grafo Neo4j.

    Cria/atualiza nós Emotion e Dream (anónimo) e a relação HAS_EMOTION.
    """
    async def _run() -> dict:
        driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        try:
            async with driver.session() as session:
                # Cria ou faz merge do nó Emotion
                await session.run(
                    """
                    MERGE (e:Emotion {name: $emotion})
                    ON CREATE SET e.created_at = datetime($timestamp)
                    """,
                    emotion=emotion,
                    timestamp=timestamp_iso,
                )

                # Cria nó Dream (anónimo) com relação ao user_hash
                await session.run(
                    """
                    MERGE (d:Dream {id: $dream_id})
                    ON CREATE SET
                        d.user_hash = $user_hash,
                        d.timestamp = datetime($timestamp),
                        d.created_at = datetime()
                    WITH d
                    MATCH (e:Emotion {name: $emotion})
                    MERGE (d)-[:HAS_EMOTION]->(e)
                    """,
                    dream_id=dream_id,
                    user_hash=user_hash,
                    emotion=emotion,
                    timestamp=timestamp_iso,
                )

                # Cria relação do user_hash para o nó Dream
                await session.run(
                    """
                    MERGE (u:UserNode {hash: $user_hash})
                    ON CREATE SET u.created_at = datetime()
                    WITH u
                    MATCH (d:Dream {id: $dream_id})
                    MERGE (u)-[:HAS_DREAM]->(d)
                    """,
                    user_hash=user_hash,
                    dream_id=dream_id,
                )

                logger.info(
                    "Neo4j updated — dream=%s emotion=%s user_hash=%s",
                    dream_id, emotion, user_hash,
                )
                return {"status": "ok", "dream_id": dream_id, "emotion": emotion}

        except Exception as exc:
            logger.error("Neo4j task failed (attempt %d): %s", self.request.retries + 1, exc)
            raise
        finally:
            await driver.close()

    try:
        return asyncio.run(_run())
    except Exception as exc:
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.critical("Neo4j task max retries exceeded for dream %s", dream_id)
            return {"status": "error", "dream_id": dream_id, "error": str(exc)}
