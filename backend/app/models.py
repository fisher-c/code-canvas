from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from .schemas import Language


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Session(Base):
    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    code_documents: Mapped[list["CodeDocument"]] = relationship(
        "CodeDocument", back_populates="session", cascade="all, delete-orphan"
    )
    participants: Mapped[list["Participant"]] = relationship(
        "Participant", back_populates="session", cascade="all, delete-orphan"
    )
    revisions: Mapped[list["CodeRevision"]] = relationship(
        "CodeRevision", back_populates="session", cascade="all, delete-orphan"
    )


class CodeDocument(Base):
    __tablename__ = "code_documents"
    __table_args__ = (UniqueConstraint("session_id", "language", name="uq_session_language"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False)
    language: Mapped[Language] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    session: Mapped[Session] = relationship("Session", back_populates="code_documents")


class CodeRevision(Base):
    __tablename__ = "code_revisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False)
    language: Mapped[Language] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    session: Mapped[Session] = relationship("Session", back_populates="revisions")


class Participant(Base):
    __tablename__ = "participants"

    participant_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid.uuid4().hex[:8])
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    session: Mapped[Session] = relationship("Session", back_populates="participants")
