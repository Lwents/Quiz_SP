import hashlib
import asyncio
import uuid
from datetime import datetime, timezone

import pytest

from app.api.v1.backups import FORMAT, TABLES, VERSION, _json_bytes, parse_backup
from app.models import Base


def test_export_round_trip_covers_tables_without_id_columns(monkeypatch):
    from app.api.v1 import backups

    backup = sample_backup()
    now = datetime.now(timezone.utc).isoformat()
    admin_id = backup["tables"]["users"][0]["id"]
    backup["tables"]["admin_settings"] = [{
        "key": "auth_policy", "value": {"registration_enabled": False},
        "created_at": now, "updated_at": now,
    }]
    backup["tables"]["email_verifications"] = [{
        "user_id": admin_id, "token_hash": "test-token-hash", "expires_at": now,
        "sent_at": now, "verified_at": None,
    }]
    visited = []

    class Rows:
        def __init__(self, rows):
            self.rows = rows

        def mappings(self):
            return self

        def all(self):
            return self.rows

    class Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        def begin(self):
            return self

        async def execute(self, statement):
            if not hasattr(statement, "get_final_froms"):
                return Rows([])
            table = statement.get_final_froms()[0]
            assert list(statement._order_by_clauses) == list(table.primary_key.columns)
            visited.append(table.name)
            return Rows(backup["tables"][table.name])

    monkeypatch.setattr(backups, "AsyncSessionLocal", Session)
    response = asyncio.run(backups.export_backup(uuid.UUID(admin_id)))
    parsed, summary = parse_backup(response.body)
    assert visited == list(TABLES)
    assert summary["database_complete"] is True
    assert summary["total_rows"] == 3
    assert parsed["admin_settings"][0]["key"] == "auth_policy"
    assert parsed["email_verifications"][0]["user_id"] == uuid.UUID(admin_id)
    assert response.headers["content-disposition"].endswith('.json"')
    assert response.headers["cache-control"] == "no-store"


EXPECTED_TABLES = {
    "users", "subjects", "topics", "lessons", "questions", "quizzes",
    "quiz_questions", "attempts", "attempt_answers", "user_lesson_progress", "audit_logs",
    "admin_settings", "login_sessions", "announcements", "announcement_reads", "user_presence", "email_verifications",
}


def sample_backup():
    now = datetime.now(timezone.utc).isoformat()
    tables = {name: [] for name in TABLES}
    tables["users"].append({
        "id": str(uuid.uuid4()),
        "email": "admin@example.test",
        "hashed_password": "test-hash",
        "full_name": "Test Admin",
        "role": "ADMIN",
        "is_active": True,
        "avatar_url": None,
        "created_at": now,
        "updated_at": now,
    })
    return {
        "format": FORMAT,
        "version": VERSION,
        "created_at": now,
        "checksum": hashlib.sha256(_json_bytes(tables)).hexdigest(),
        "tables": tables,
    }


def test_valid_backup_preview_counts():
    parsed, summary = parse_backup(_json_bytes(sample_backup()))
    assert summary["counts"]["users"] == 1
    assert summary["total_rows"] == 1
    assert summary["database_complete"] is True
    assert set(summary["included_tables"]) == EXPECTED_TABLES
    assert parsed["users"][0]["id"]


def test_backup_covers_every_application_database_table():
    assert set(TABLES) == EXPECTED_TABLES
    assert set(TABLES) == set(Base.metadata.tables)


def test_backup_supports_operational_settings_with_string_primary_key():
    backup = sample_backup()
    now = datetime.now(timezone.utc).isoformat()
    backup["tables"]["admin_settings"] = [{"key": "auth_policy", "value": {"registration_enabled": False}, "created_at": now, "updated_at": now}]
    backup["checksum"] = hashlib.sha256(_json_bytes(backup["tables"])).hexdigest()
    parsed, _ = parse_backup(_json_bytes(backup))
    assert parsed["admin_settings"][0]["key"] == "auth_policy"


def test_old_backup_initializes_new_operational_tables():
    backup = sample_backup()
    for name in ("audit_logs", "admin_settings", "login_sessions", "announcements", "announcement_reads"):
        backup["tables"].pop(name)
    backup["checksum"] = hashlib.sha256(_json_bytes(backup["tables"])).hexdigest()
    parsed, summary = parse_backup(_json_bytes(backup))
    assert parsed["login_sessions"] == []
    assert "admin_settings" in summary["initialized_missing_tables"]


def test_modified_backup_is_rejected():
    backup = sample_backup()
    backup["tables"]["users"][0]["full_name"] = "Changed"
    with pytest.raises(ValueError, match="checksum"):
        parse_backup(_json_bytes(backup))


def test_backup_must_keep_an_active_admin():
    backup = sample_backup()
    backup["tables"]["users"][0]["is_active"] = False
    backup["checksum"] = hashlib.sha256(_json_bytes(backup["tables"])).hexdigest()
    with pytest.raises(ValueError, match="active administrator"):
        parse_backup(_json_bytes(backup))
