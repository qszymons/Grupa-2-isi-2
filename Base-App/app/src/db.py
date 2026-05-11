"""A module for providing database access."""

import asyncio

import databases
import sqlalchemy
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.exc import OperationalError, DatabaseError
from sqlalchemy.ext.asyncio import create_async_engine
from pgvector.sqlalchemy import Vector
from asyncpg.exceptions import (  # type: ignore
    CannotConnectNowError,
    ConnectionDoesNotExistError,
)

from src.config import config

metadata = sqlalchemy.MetaData()

user_table = sqlalchemy.Table(
    "users",
    metadata,
    sqlalchemy.Column(
        "id",
        UUID(as_uuid=True),
        primary_key=True,
        server_default=sqlalchemy.text("gen_random_uuid()"),
    ),
    sqlalchemy.Column("email", sqlalchemy.String, unique=True),
    sqlalchemy.Column("username", sqlalchemy.String, unique=True, nullable=False),
    sqlalchemy.Column("image", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("password", sqlalchemy.String),
    sqlalchemy.Column("is_verified", sqlalchemy.Boolean)
)

project_table = sqlalchemy.Table(
    "projects",
    metadata,
    sqlalchemy.Column(
        "id",
        UUID(as_uuid=True),
        primary_key=True,
        server_default=sqlalchemy.text("gen_random_uuid()"),
    ),
    sqlalchemy.Column("name", sqlalchemy.String),
    sqlalchemy.Column("data", sqlalchemy.String),
    sqlalchemy.Column(
        "user_id",
        UUID(as_uuid=True),
        sqlalchemy.ForeignKey("users.id"),
        nullable=False,
    ),
)

db_uri = (
    f"postgresql+asyncpg://{config.DB_USER}:{config.DB_PASSWORD}"
    f"@{config.DB_HOST}/{config.DB_NAME}"
)

engine = create_async_engine(
    db_uri,
    echo=True,
    future=True,
    pool_pre_ping=True,
)

database = databases.Database(
    db_uri,
)

tag_table = sqlalchemy.Table(
    "tags",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.Integer,
        primary_key=True,
        autoincrement=True,
    ),
    sqlalchemy.Column(
        "name",
        sqlalchemy.String(64),
        nullable=False,
    ),
    sqlalchemy.Column(
        "created_at",
        sqlalchemy.DateTime(timezone=True),
        nullable=False,
        server_default=sqlalchemy.func.now(),
    ),
)

sqlalchemy.Index(
    "uq_tags_name_lower",
    sqlalchemy.func.lower(tag_table.c.name),
    unique=True,
)

project_tags_table = sqlalchemy.Table(
    "project_tags",
    metadata,
    sqlalchemy.Column(
        "project_id",
        UUID(as_uuid=True),
        sqlalchemy.ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    sqlalchemy.Column(
        "tag_id",
        sqlalchemy.Integer,
        sqlalchemy.ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
)

document_table = sqlalchemy.Table(
    "documents",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.Integer,
        primary_key=True,
        autoincrement=True,
    ),
    sqlalchemy.Column(
        "public_id",
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        server_default=sqlalchemy.text("gen_random_uuid()"),
    ),
    sqlalchemy.Column(
        "project_id",
        UUID(as_uuid=True),
        sqlalchemy.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sqlalchemy.Column("name", sqlalchemy.String(255), nullable=False),
    sqlalchemy.Column("data", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column(
        "is_public",
        sqlalchemy.Boolean,
        nullable=False,
        server_default=sqlalchemy.text("false"),
    ),
    sqlalchemy.Column(
        "created_at",
        sqlalchemy.DateTime(timezone=True),
        nullable=False,
        server_default=sqlalchemy.func.now(),
    ),
)


document_chunks_table = sqlalchemy.Table(
    "document_chunks",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.Integer,
        primary_key=True,
        autoincrement=True,
    ),
    sqlalchemy.Column(
        "document_id",
        sqlalchemy.Integer,
        sqlalchemy.ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sqlalchemy.Column("chunk_index", sqlalchemy.Integer, nullable=False),
    sqlalchemy.Column("content", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("char_offset", sqlalchemy.Integer, nullable=False),
    sqlalchemy.Column("token_count", sqlalchemy.Integer, nullable=True),
    sqlalchemy.Column("strategy", sqlalchemy.String(32), nullable=True),
    sqlalchemy.Column("chunk_size_used", sqlalchemy.Integer, nullable=True),
    sqlalchemy.Column("chunk_overlap_used", sqlalchemy.Integer, nullable=True),
    sqlalchemy.Column(
        "created_at",
        sqlalchemy.DateTime(timezone=True),
        nullable=True,
        server_default=sqlalchemy.func.now(),
    ),
)

sqlalchemy.Index(
    "idx_chunks_doc_idx",
    document_chunks_table.c.document_id,
    document_chunks_table.c.chunk_index,
)

chunk_embeddings_table = sqlalchemy.Table(
    "chunk_embeddings",
    metadata,
    sqlalchemy.Column(
        "id",
        sqlalchemy.Integer,
        primary_key=True,
        autoincrement=True,
    ),
    sqlalchemy.Column(
        "chunk_id",
        sqlalchemy.Integer,
        sqlalchemy.ForeignKey("document_chunks.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sqlalchemy.Column(
        "model_name", sqlalchemy.String(128), nullable=False,
    ),
    # Vector() without fixed dim — supports any embedding model dimension
    sqlalchemy.Column("embedding", Vector(), nullable=False),
    sqlalchemy.Column(
        "created_at",
        sqlalchemy.DateTime(timezone=True),
        nullable=False,
        server_default=sqlalchemy.func.now(),
    ),
)

sqlalchemy.Index(
    "uq_chunk_model",
    chunk_embeddings_table.c.chunk_id,
    chunk_embeddings_table.c.model_name,
    unique=True,
)


async def init_db(retries: int = 5, delay: int = 5) -> None:
    """Function initializing the DB.

    Args:
        retries (int, optional): Number of retries of connect to DB.
            Defaults to 5.
        delay (int, optional): Delay of connect do DB. Defaults to 2.
    """
    for attempt in range(retries):
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    sqlalchemy.text("CREATE EXTENSION IF NOT EXISTS vector")
                )
                await conn.run_sync(metadata.create_all)

                for col, typ in [
                    ("strategy", "VARCHAR(32)"),
                    ("chunk_size_used", "INTEGER"),
                    ("chunk_overlap_used", "INTEGER"),
                    ("created_at", "TIMESTAMPTZ DEFAULT now()"),
                ]:
                    await conn.execute(sqlalchemy.text(f"""
                        DO $$ BEGIN
                            ALTER TABLE document_chunks ADD COLUMN {col} {typ};
                        EXCEPTION WHEN duplicate_column THEN NULL;
                        END $$;
                    """))

                await conn.execute(sqlalchemy.text("""
                    DO $$ BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='document_chunks'
                              AND column_name='embedding'
                        ) THEN
                            INSERT INTO chunk_embeddings (chunk_id, model_name, embedding)
                            SELECT id, COALESCE(embedding_model, 'unknown'), embedding
                            FROM document_chunks
                            WHERE embedding IS NOT NULL
                            ON CONFLICT DO NOTHING;

                            ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;
                            ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding_model;
                        END IF;
                    END $$;
                """))

            return
        except (
            OperationalError,
            DatabaseError,
            CannotConnectNowError,
            ConnectionDoesNotExistError,
        ) as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            await asyncio.sleep(delay)

    raise ConnectionError("Could not connect to DB after several retries.")
