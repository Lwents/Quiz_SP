import hashlib
import uuid
from datetime import datetime, timezone

import pytest

from app.api.v1.backups import FORMAT, TABLES, VERSION, _json_bytes, parse_backup


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
    assert parsed["users"][0]["id"]


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
