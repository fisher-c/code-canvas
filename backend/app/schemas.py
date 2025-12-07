from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Language(str, Enum):
    javascript = "javascript"
    python = "python"
    sql = "sql"


class HealthResponse(BaseModel):
    status: str = "ok"


class CreateSessionRequest(BaseModel):
    sessionId: Optional[str] = Field(
        default=None,
        pattern=r"^[a-z0-9]{6,12}$",
        description="Optional client-provided session ID",
    )
    title: Optional[str] = None
    defaultLanguage: Optional[Language] = None


class JoinSessionRequest(BaseModel):
    displayName: Optional[str] = None


class UpdateCodeRequest(BaseModel):
    language: Language
    content: str
    author: Optional[str] = None


class CodeDocument(BaseModel):
    language: Language
    content: str
    version: int
    updatedAt: datetime
    updatedBy: Optional[str] = None


class Participant(BaseModel):
    participantId: str
    displayName: Optional[str] = None
    joinedAt: datetime
    lastSeenAt: datetime


class Session(BaseModel):
    sessionId: str
    title: Optional[str] = None
    createdAt: datetime
    lastActiveAt: datetime
    activeParticipants: int
    codeByLanguage: Dict[Language, CodeDocument]
    participants: List[Participant]


class CodeSnapshot(BaseModel):
    sessionId: str
    codeByLanguage: Dict[Language, CodeDocument]


class SessionPresence(BaseModel):
    sessionId: str
    participantId: Optional[str] = None
    activeParticipants: int
    participants: List[Participant]


class CodeHistory(BaseModel):
    sessionId: str
    revisions: Dict[Language, List[CodeDocument]]
    limit: int


class ErrorResponse(BaseModel):
    detail: str
