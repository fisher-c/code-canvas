import random
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import Select, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .defaults import DEFAULT_CODE_SNIPPETS, SUPPORTED_LANGUAGES
from .models import CodeDocument, CodeRevision, Participant, Session
from .schemas import Language


class DBStore:
    """Database-backed store implementing the OpenAPI contract."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _generate_unique_session_id(self) -> str:
        chars = string.ascii_lowercase + string.digits
        while True:
            candidate = "".join(random.choice(chars) for _ in range(6))
            exists = await self.session.scalar(
                select(Session.session_id).where(Session.session_id == candidate)
            )
            if not exists:
                return candidate

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    async def create_session(self, session_id: Optional[str], title: Optional[str]) -> Session:
        sid = session_id or await self._generate_unique_session_id()
        session_model = Session(session_id=sid, title=title)

        for lang in SUPPORTED_LANGUAGES:
            content = DEFAULT_CODE_SNIPPETS.get(lang, "")
            doc = CodeDocument(
                session_id=sid,
                language=lang,
                content=content,
                version=1,
                updated_at=self._now(),
                updated_by="system",
            )
            session_model.code_documents.append(doc)
            session_model.revisions.append(
                CodeRevision(
                    session_id=sid,
                    language=lang,
                    content=content,
                    version=1,
                    updated_at=doc.updated_at,
                    updated_by="system",
                )
            )

        self.session.add(session_model)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise ValueError("session already exists")

        await self.session.refresh(session_model)
        return session_model

    async def get_session(self, session_id: str) -> Session:
        stmt: Select = (
            select(Session)
            .where(Session.session_id == session_id)
            .options(
                selectinload(Session.code_documents),
                selectinload(Session.participants),
            )
        )
        result = await self.session.execute(stmt)
        session_model = result.scalar_one_or_none()
        if not session_model:
            raise KeyError("session not found")
        return session_model

    async def prune_stale_participants(self, session_id: str, ttl_seconds: int) -> None:
        if ttl_seconds <= 0:
            return
        cutoff = self._now() - timedelta(seconds=ttl_seconds)
        stmt = delete(Participant).where(
            Participant.session_id == session_id,
            Participant.last_seen_at < cutoff,
        )
        await self.session.execute(stmt)
        await self.session.commit()

    async def update_code(self, session_id: str, language: Language, content: str, author: Optional[str]) -> CodeDocument:
        session_model = await self.get_session(session_id)

        doc = next((d for d in session_model.code_documents if d.language == language), None)
        next_version = (doc.version if doc else 0) + 1
        now = self._now()

        if doc:
            doc.content = content
            doc.version = next_version
            doc.updated_at = now
            doc.updated_by = author
        else:
            doc = CodeDocument(
                session_id=session_id,
                language=language,
                content=content,
                version=next_version,
                updated_at=now,
                updated_by=author,
            )
            self.session.add(doc)
            session_model.code_documents.append(doc)

        revision = CodeRevision(
            session_id=session_id,
            language=language,
            content=content,
            version=next_version,
            updated_at=now,
            updated_by=author,
        )
        self.session.add(revision)

        session_model.last_active_at = now
        await self.session.commit()
        await self.session.refresh(doc)
        return doc

    async def get_code_snapshot(self, session_id: str, language: Optional[Language]) -> Dict[Language, CodeDocument]:
        session_model = await self.get_session(session_id)
        code_by_language = {doc.language: doc for doc in session_model.code_documents}

        if language:
            if language not in code_by_language:
                raise ValueError("language not found")
            return {language: code_by_language[language]}

        return code_by_language

    async def get_history(self, session_id: str, language: Optional[Language], limit: int) -> Dict[Language, List[CodeRevision]]:
        session_model = await self.get_session(session_id)

        grouped: Dict[Language, List[CodeRevision]] = {}

        target_languages = [language] if language else [Language(l) for l in SUPPORTED_LANGUAGES]
        for lang in target_languages:
            stmt = (
                select(CodeRevision)
                .where(CodeRevision.session_id == session_model.session_id, CodeRevision.language == lang)
                .order_by(CodeRevision.version.desc())
                .limit(limit)
            )
            result = await self.session.execute(stmt)
            revisions = list(reversed(result.scalars().all()))
            if revisions:
                grouped[lang] = revisions

        if language and language not in grouped:
            raise ValueError("language not found")

        return grouped

    async def register_participant(self, session_id: str, display_name: Optional[str]) -> Participant:
        session_model = await self.get_session(session_id)
        participant_id = uuid.uuid4().hex[:8]
        now = self._now()
        participant = Participant(
            participant_id=participant_id,
            session_id=session_model.session_id,
            display_name=display_name,
            joined_at=now,
            last_seen_at=now,
        )
        self.session.add(participant)
        session_model.last_active_at = now
        await self.session.commit()
        await self.session.refresh(participant)
        return participant

    async def remove_participant(self, session_id: str, participant_id: str) -> None:
        session_model = await self.get_session(session_id)
        participant = await self.session.get(Participant, participant_id)
        if participant:
            await self.session.delete(participant)
            session_model.last_active_at = self._now()
            await self.session.commit()
            await self.session.refresh(session_model, attribute_names=["participants"])

    def to_session_schema(self, session_model: Session):
        from .schemas import CodeDocument as CodeDocumentSchema, Participant as ParticipantSchema, Session as SessionSchema

        code_map = {
            Language(doc.language): CodeDocumentSchema(
                language=Language(doc.language),
                content=doc.content,
                version=doc.version,
                updatedAt=doc.updated_at,
                updatedBy=doc.updated_by,
            )
            for doc in session_model.code_documents
        }

        participants = [
            ParticipantSchema(
                participantId=p.participant_id,
                displayName=p.display_name,
                joinedAt=p.joined_at,
                lastSeenAt=p.last_seen_at,
            )
            for p in session_model.participants
        ]

        return SessionSchema(
            sessionId=session_model.session_id,
            title=session_model.title,
            createdAt=session_model.created_at,
            lastActiveAt=session_model.last_active_at,
            activeParticipants=len(participants),
            codeByLanguage=code_map,
            participants=participants,
        )

    def to_code_document_schema(self, doc: CodeDocument):
        from .schemas import CodeDocument as CodeDocumentSchema

        return CodeDocumentSchema(
            language=Language(doc.language),
            content=doc.content,
            version=doc.version,
            updatedAt=doc.updated_at,
            updatedBy=doc.updated_by,
        )
