"""
Dream Network — Router: grafo de emoções (Neo4j).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncGraphDatabase, AsyncDriver

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/graph", tags=["graph"])


# ── Driver Neo4j ─────────────────────────────────────────────────────────

_driver: AsyncDriver | None = None


async def get_neo4j_driver() -> AsyncDriver:
    """Retorna o driver Neo4j (singleton)."""
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        # Verifica conectividade
        await _driver.verify_connectivity()
        logger.info("Connected to Neo4j at %s", settings.neo4j_uri)
    return _driver


async def close_neo4j() -> None:
    """Fecha o driver Neo4j (chamar no shutdown)."""
    global _driver
    if _driver:
        await _driver.close()
        _driver = None
        logger.info("Neo4j driver closed")


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/emotions")
async def get_emotion_graph(
    driver: AsyncDriver = Depends(get_neo4j_driver),
) -> dict:
    """
    Retorna nós e arestas do grafo de emoções partilhadas.
    Formato compatível com D3.js force layout:
      { nodes: [{id, name, type, count}], links: [{source, target, weight}] }
    """
    try:
        async with driver.session() as session:
            # Busca todos os nós Emotion com contagem de sonhos
            result = await session.run(
                """
                MATCH (e:Emotion)<-[r:HAS_EMOTION]-(d:Dream)
                WITH e, count(d) AS count
                RETURN e.name AS name, count
                ORDER BY count DESC
                """
            )
            emotion_nodes = []
            async for record in result:
                emotion_nodes.append({
                    "id": f"emotion-{record['name']}",
                    "name": record["name"],
                    "type": "emotion",
                    "count": record["count"],
                })

            # Links: neste MVP ligamos emoções que co-ocorrem no mesmo user_hash
            # (dois sonhos do mesmo user com emoções diferentes)
            result2 = await session.run(
                """
                MATCH (d1:Dream)-[:HAS_EMOTION]->(e1:Emotion)
                MATCH (d2:Dream)-[:HAS_EMOTION]->(e2:Emotion)
                WHERE d1.user_hash = d2.user_hash
                  AND d1.id <> d2.id
                  AND e1.name < e2.name
                WITH e1.name AS source, e2.name AS target, COUNT(*) AS weight
                RETURN source, target, weight
                ORDER BY weight DESC
                LIMIT 50
                """
            )
            links = []
            async for record in result2:
                links.append({
                    "source": f"emotion-{record['source']}",
                    "target": f"emotion-{record['target']}",
                    "weight": record["weight"],
                })

            return {"nodes": emotion_nodes, "links": links}

    except Exception as exc:
        logger.error("Error fetching emotion graph: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar grafo de emoções")
