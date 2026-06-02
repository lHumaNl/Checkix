"""Regression tests for Alembic metadata bootstrap imports."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from checkix.models.base import Base

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_PATH = str(REPO_ROOT / "src")
SYNC_DATABASE_URL = "postgresql://checkix:checkix@localhost:5432/checkix"


def test_database_import_is_safe_with_sync_database_url() -> None:
    """Importing metadata must not create the async runtime engine."""
    result = subprocess.run(
        [sys.executable, "-c", _metadata_import_probe()],
        cwd=REPO_ROOT,
        env=_sync_database_env(),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr


def test_alembic_offline_upgrade_renders_baseline_schema() -> None:
    """Alembic should render baseline SQL without connecting to PostgreSQL."""
    result = subprocess.run(
        [sys.executable, "-c", _alembic_upgrade_probe(sql=True)],
        cwd=REPO_ROOT,
        env=_sync_database_env(),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE auth_user" in result.stdout
    assert "CREATE TABLE checklist_templates" in result.stdout


def test_metadata_preserves_legacy_table_names() -> None:
    """ORM metadata should keep intentional legacy table names."""
    import checkix.models  # noqa: F401

    required_tables = {
        "auth_user",
        "users_userprofile",
        "checklist_templates",
        "checklist_versions",
        "checklist_instances",
        "todo_lists",
        "run_links",
    }

    assert required_tables.issubset(Base.metadata.tables)


def _sync_database_env() -> dict[str, str]:
    env = os.environ.copy()
    env["DATABASE_URL"] = SYNC_DATABASE_URL
    env["DATABASE_URL_SYNC"] = SYNC_DATABASE_URL
    env["PYTHONPATH"] = _pythonpath_with_src(env.get("PYTHONPATH"))
    return env


def _pythonpath_with_src(current_pythonpath: str | None) -> str:
    if not current_pythonpath:
        return SRC_PATH
    return f"{SRC_PATH}{os.pathsep}{current_pythonpath}"


def _metadata_import_probe() -> str:
    return "\n".join(
        (
            "import checkix.database as database",
            "from checkix.models.base import Base",
            "import checkix.models",
            "assert database._engine is None",
            "assert Base.metadata.tables",
        )
    )


def _alembic_upgrade_probe(*, sql: bool) -> str:
    return "\n".join(
        (
            "from alembic import command",
            "from alembic.config import Config",
            "command.upgrade(Config('alembic.ini'), 'head', sql=%r)" % sql,
        )
    )
