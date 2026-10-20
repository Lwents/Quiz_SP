"""Tab-aware online presence, streamed to authenticated administrators."""
import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, delete, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, require_role, oauth2_scheme
from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_token, token_matches_user
from app.core.login_sessions import validate_session
from app.core.rate_limit import limiter
from app.models import User, UserRole, UserPresence

router = APIRouter(tags=["presence"])
ONLINE_SECONDS = 45


class PresenceInput(BaseModel):
    tab_id: uuid.UUID
    visible: bool = True


@router.post("/presence")
async def heartbeat(data: PresenceInput, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    limiter.check(("presence", str(user.id)), 120, 60)
    now = datetime.now(timezone.utc)
    if data.visible:
        statement = insert(UserPresence).values(id=data.tab_id, user_id=user.id, last_seen_at=now)
        await db.execute(statement.on_conflict_do_update(index_elements=[UserPresence.id],
            set_={"last_seen_at": now}, where=UserPresence.user_id == user.id))
    else:
        await db.execute(delete(UserPresence).where(UserPresence.id == data.tab_id, UserPresence.user_id == user.id))
    await db.execute(delete(UserPresence).where(UserPresence.last_seen_at < now - timedelta(minutes=5)))
    await db.commit()
    return {"ok": True}


async def online_snapshot(db):
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ONLINE_SECONDS)
    statement = (select(User.id, User.full_name, User.email, func.max(UserPresence.last_seen_at).label("seen"))
                 .join(UserPresence, User.id == UserPresence.user_id)
                 .where(User.is_active.is_(True), UserPresence.last_seen_at >= cutoff)
                 .group_by(User.id, User.full_name, User.email))
    total = (await db.execute(select(func.count()).select_from(statement.subquery()))).scalar() or 0
    rows = (await db.execute(statement.order_by(func.max(UserPresence.last_seen_at).desc()).limit(200))).all()
    return {"total": total, "users": [{"id": str(uid), "full_name": name, "email": email, "last_seen_at": seen.isoformat()} for uid, name, email, seen in rows],
            "updated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/admin/presence/stream")
async def stream_online(request: Request, token: str = Depends(oauth2_scheme),
                        db: AsyncSession = Depends(get_db), actor: User = Depends(require_role(UserRole.ADMIN))):
    actor_id, payload = actor.id, decode_token(token)
    # Release the authentication transaction. Each sample owns a short-lived
    # session rather than pinning a connection for the life of an SSE stream.
    await db.rollback()

    async def stream():
        while not await request.is_disconnected():
            async with AsyncSessionLocal() as session:
                user = (await session.execute(select(User).where(User.id == actor_id))).scalar_one_or_none()
                if decode_token(token) is None or not token_matches_user(payload, user) or user.role != UserRole.ADMIN:
                    yield 'event: expired\ndata: {}\n\n'
                    return
                try:
                    await validate_session(session, payload, user.id, touch=False)
                except HTTPException:
                    yield 'event: expired\ndata: {}\n\n'
                    return
                snapshot = await online_snapshot(session)
            yield "data: " + json.dumps(snapshot, ensure_ascii=False) + "\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"X-Accel-Buffering": "no", "Cache-Control": "no-store"})
