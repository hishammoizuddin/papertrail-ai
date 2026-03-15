"""
neo4j_graph.py

Neo4j driver singleton and schema bootstrap for PaperTrail AI.
Provides get_neo4j_driver() and bootstrap_schema() helpers.
"""
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase, Driver
from typing import Optional

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

_driver: Optional[Driver] = None


def get_neo4j_driver() -> Driver:
    """Return the shared Neo4j driver instance, creating it on first call."""
    global _driver
    if _driver is None:
        if not NEO4J_URI or not NEO4J_PASSWORD:
            raise RuntimeError(
                "Neo4j credentials missing. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env"
            )
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


def close_driver():
    """Close the driver — call on app shutdown."""
    global _driver
    if _driver:
        _driver.close()
        _driver = None


def bootstrap_schema():
    """
    Create uniqueness constraints and indexes so MERGE operations are fast
    and entity deduplication is enforced at the DB level.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Uniqueness constraints (also create an index automatically)
        constraints = [
            ("Document", "id"),
            ("Entity", "id"),
        ]
        for label, prop in constraints:
            try:
                session.run(
                    f"CREATE CONSTRAINT {label.lower()}_{prop}_unique IF NOT EXISTS "
                    f"FOR (n:{label}) REQUIRE n.{prop} IS UNIQUE"
                )
            except Exception as e:
                # Older Neo4j syntax fallback
                try:
                    session.run(
                        f"CREATE CONSTRAINT ON (n:{label}) ASSERT n.{prop} IS UNIQUE"
                    )
                except Exception:
                    print(f"Warning: Could not create constraint for {label}.{prop}: {e}")

        # Index on user_id for fast per-user queries
        for label in ("Document", "Entity"):
            try:
                session.run(
                    f"CREATE INDEX {label.lower()}_user_id_idx IF NOT EXISTS "
                    f"FOR (n:{label}) ON (n.user_id)"
                )
            except Exception as e:
                print(f"Warning: Could not create index for {label}.user_id: {e}")

    print("✅ Neo4j schema bootstrapped successfully")
