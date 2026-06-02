"""Alembic migration environment configuration.

Adds ``src`` to ``sys.path`` so that ``checkix`` package imports resolve
correctly, then wires SQLAlchemy metadata and sync database URL into the
migration runner.
"""

from logging.config import fileConfig
import sys
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ---------------------------------------------------------------------------
# Ensure the ``src`` directory is importable so ``checkix.*`` works.
# ---------------------------------------------------------------------------
_SRC_DIR = str(Path(__file__).resolve().parents[1] / "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

# Import application components after path is set.
from checkix.config import settings  # noqa: E402
from checkix.models.base import Base  # noqa: E402
from checkix.models import *  # noqa: E402,F401,F403 – register all models with Base

# ---------------------------------------------------------------------------
# Alembic Config object — provides access to values in alembic.ini.
# ---------------------------------------------------------------------------
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the *synchronous* database URL so Alembic can connect without
# async drivers (asyncpg is not supported by Alembic's default runner).
config.set_main_option("sqlalchemy.url", settings.database_url_sync)

# Meta-data target for autogenerate support.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in "offline" mode.

    Configures the context with just a URL and not an Engine.  Calls to
    ``context.execute()`` emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in "online" mode.

    Creates an Engine and associates a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
