"""Portable, administrator-only snapshots of application data.

The snapshot contains database rows, including password hashes and personal data.
It deliberately excludes environment variables and external files referenced by URL.
"""

import hashlib
import hmac
import json
import math
import uuid
from datetime import datetime, timezone
from enum import Enum as PythonEnum

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, String, UniqueConstraint, delete, insert, select, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import AsyncSessionLocal, get_db
from app.models import (
    Attempt, AttemptAnswer, Lesson, Question, Quiz, QuizQuestion,
    Subject, Topic, User, UserLessonProgress, UserRole,
)


router = APIRouter(prefix="/backups", tags=["backups"])

FORMAT = "quiz-sp-backup"
VERSION = 1
MAX_BACKUP_BYTES = 50 * 1024 * 1024
MAX_ROWS = 200_000
MODELS = (
    User, Subject, Topic, Quiz, Question, Lesson, QuizQuestion,
    Attempt, AttemptAnswer, UserLessonProgress,
)
TABLES = {model.__tablename__: model.__table__ for model in MODELS}


async def _authorize_admin(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    admin_id = current_user.id
    # The authentication SELECT must release its table lock before a restore
    # requests ACCESS EXCLUSIVE locks in a separate transaction.
    await db.rollback()
    return admin_id


def _json_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _encode_value(value: object) -> object:
    if isinstance(value, PythonEnum):
        return value.value
    if isinstance(value, (uuid.UUID, datetime)):
        return str(value) if isinstance(value, uuid.UUID) else value.isoformat()
    return value


def _decode_value(column, value: object) -> object:
    if value is None:
        if not column.nullable and not column.primary_key:
            raise ValueError(f"Missing required field {column.name}")
        if column.primary_key:
            raise ValueError(f"Missing ID in {column.table.name}")
        return None

    column_type = column.type
    if isinstance(column_type, PGUUID):
        if not isinstance(value, str):
            raise ValueError(f"Invalid UUID in {column.table.name}.{column.name}")
        return uuid.UUID(value)
    if isinstance(column_type, DateTime):
        if not isinstance(value, str):
            raise ValueError(f"Invalid date in {column.table.name}.{column.name}")
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            raise ValueError(f"Date must include timezone in {column.table.name}.{column.name}")
        return parsed
    if isinstance(column_type, Enum):
        if not isinstance(value, str):
            raise ValueError(f"Invalid enum in {column.table.name}.{column.name}")
        return column_type.enum_class(value)
    if isinstance(column_type, JSONB):
        return value
    if isinstance(column_type, Boolean):
        if not isinstance(value, bool):
            raise ValueError(f"Invalid boolean in {column.table.name}.{column.name}")
        return value
    if isinstance(column_type, Integer):
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError(f"Invalid integer in {column.table.name}.{column.name}")
        return value
    if isinstance(column_type, Float):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid number in {column.table.name}.{column.name}")
        return float(value)
    if isinstance(column_type, String):
        if not isinstance(value, str) or (column_type.length and len(value) > column_type.length):
            raise ValueError(f"Invalid text in {column.table.name}.{column.name}")
        return value
    raise ValueError(f"Unsupported column {column.table.name}.{column.name}")


def _validate_rows(tables: dict) -> dict:
    if set(tables) != set(TABLES):
        raise ValueError("Backup tables do not match this application version")

    parsed = {}
    total = 0
    for name, table in TABLES.items():
        rows = tables[name]
        if not isinstance(rows, list):
            raise ValueError(f"Invalid rows in {name}")
        total += len(rows)
        if total > MAX_ROWS:
            raise ValueError("Backup contains too many rows")

        expected_columns = {column.name for column in table.columns}
        parsed[name] = []
        for row in rows:
            if not isinstance(row, dict) or set(row) != expected_columns:
                raise ValueError(f"Invalid columns in {name}")
            parsed[name].append({column.name: _decode_value(column, row[column.name]) for column in table.columns})

        # Detect duplicate primary and natural keys before touching the target database.
        unique_groups = [tuple(column.name for column in table.primary_key.columns)]
        unique_groups.extend((column.name,) for column in table.columns if column.unique)
        unique_groups.extend(tuple(column.name for column in constraint.columns)
                             for constraint in table.constraints if isinstance(constraint, UniqueConstraint))
        for keys in unique_groups:
            seen = set()
            for row in parsed[name]:
                key = tuple(row[column] for column in keys)
                if any(value is None for value in key):
                    continue
                if key in seen:
                    raise ValueError(f"Duplicate value in {name}: {', '.join(keys)}")
                seen.add(key)

    ids = {name: {row["id"] for row in rows} for name, rows in parsed.items()}
    for name, table in TABLES.items():
        for column in table.columns:
            for foreign_key in column.foreign_keys:
                parent_name = foreign_key.column.table.name
                if parent_name not in ids:
                    raise ValueError(f"Unsupported reference in {name}")
                for row in parsed[name]:
                    value = row[column.name]
                    if value is not None and value not in ids[parent_name]:
                        raise ValueError(f"Broken reference in {name}.{column.name}")

    if not any(row["role"] == UserRole.ADMIN and row["is_active"] for row in parsed["users"]):
        raise ValueError("Backup must contain an active administrator")
    return parsed


def parse_backup(raw: bytes) -> tuple[dict, dict]:
    if not raw or len(raw) > MAX_BACKUP_BYTES:
        raise ValueError("Backup file is empty or exceeds 50 MB")
    try:
        data = json.loads(raw.decode("utf-8"), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
        if not isinstance(data, dict) or set(data) != {"format", "version", "created_at", "checksum", "tables"}:
            raise ValueError("Invalid backup format")
        if data["format"] != FORMAT or data["version"] != VERSION:
            raise ValueError("Unsupported backup version")
        created_at = datetime.fromisoformat(data["created_at"])
        if created_at.tzinfo is None:
            raise ValueError("Invalid backup date")
        if not isinstance(data["tables"], dict) or not isinstance(data["checksum"], str):
            raise ValueError("Invalid backup contents")
        actual_checksum = hashlib.sha256(_json_bytes(data["tables"])).hexdigest()
        if not hmac.compare_digest(data["checksum"], actual_checksum):
            raise ValueError("Backup checksum does not match")
        parsed = _validate_rows(data["tables"])
        return parsed, {
            "format": FORMAT,
            "version": VERSION,
            "created_at": data["created_at"],
            "checksum": data["checksum"],
            "counts": {name: len(rows) for name, rows in parsed.items()},
        }
    except (UnicodeError, json.JSONDecodeError, TypeError, KeyError, OverflowError) as exc:
        raise ValueError("Invalid backup file") from exc


async def _read_backup(file: UploadFile) -> tuple[dict, dict]:
    try:
        raw = await file.read(MAX_BACKUP_BYTES + 1)
    finally:
        await file.close()
    try:
        return parse_backup(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/export")
async def export_backup(admin_id: uuid.UUID = Depends(_authorize_admin)):
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
            tables = {}
            for name, table in TABLES.items():
                rows = (await session.execute(select(table).order_by(table.c.id))).mappings().all()
                tables[name] = [
                    {column.name: _encode_value(row[column.name]) for column in table.columns}
                    for row in rows
                ]

    created_at = datetime.now(timezone.utc)
    backup = {
        "format": FORMAT,
        "version": VERSION,
        "created_at": created_at.isoformat(),
        "checksum": hashlib.sha256(_json_bytes(tables)).hexdigest(),
        "tables": tables,
    }
    content = _json_bytes(backup)
    if len(content) > MAX_BACKUP_BYTES:
        raise HTTPException(status_code=413, detail="Backup exceeds the 50 MB download limit")
    filename = f"quiz-sp-backup-{created_at:%Y%m%d-%H%M%S}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/preview")
async def preview_backup(file: UploadFile = File(...), admin_id: uuid.UUID = Depends(_authorize_admin)):
    _, summary = await _read_backup(file)
    return summary


@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    confirmation: str = Form(...),
    admin_id: uuid.UUID = Depends(_authorize_admin),
):
    if confirmation != "REPLACE":
        raise HTTPException(status_code=400, detail="Explicit REPLACE confirmation is required")
    rows_by_table, summary = await _read_backup(file)

    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(text("SET LOCAL lock_timeout = '10s'"))
                await session.execute(text("LOCK TABLE " + ", ".join(TABLES) + " IN ACCESS EXCLUSIVE MODE"))
                for table in reversed(tuple(TABLES.values())):
                    await session.execute(delete(table))
                for name, table in TABLES.items():
                    rows = rows_by_table[name]
                    for start in range(0, len(rows), 1000):
                        await session.execute(insert(table), rows[start:start + 1000])
    except (IntegrityError, DBAPIError) as exc:
        raise HTTPException(status_code=409, detail="Could not restore backup; database was not changed") from exc

    return {"message": "Backup restored", **summary}
