from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin


class AuditLog(Base, UUIDMixin):
    """Minimal, privacy-conscious authentication audit trail.

    The table intentionally stores no password, token, request body, or raw
    network identifier. It is used by administrators to understand login
    activity without creating another source of sensitive data.
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_action_occurred_at", "action", "occurred_at"),
        Index("ix_audit_logs_user_occurred_at", "user_id", "occurred_at"),
    )

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(48), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    occurred_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
