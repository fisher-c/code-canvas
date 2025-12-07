import random
import string
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Dict, List, Optional

from .defaults import DEFAULT_CODE_SNIPPETS, SUPPORTED_LANGUAGES
from .schemas import CodeDocument, Language, Participant, Session


class MockDatabase:
    """In-memory store that mirrors the data shapes defined in the OpenAPI spec."""

    def __init__(self) -> None:
        self.sessions: Dict[str, Dict] = {}

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _generate_session_id(self) -> str:
        chars = string.ascii_lowercase + string.digits
        return "".join(random.choice(chars) for _ in range(6))

    def _new_code_record(
        self, language: Language, content: str, author: Optional[str] = None, version: int = 1
    ) -> Dict:
        now = self._now()
        return {
            "language": language,
            "content": content,
            "version": version,
            "updated_at": now,
            "updated_by": author,
        }

    def create_session(self, session_id: Optional[str], title: Optional[str]) -> Dict:
        session_id = session_id or self._generate_unique_session_id()
        if session_id in self.sessions:
            raise ValueError("session already exists")

        now = self._now()
        code_by_language = {}
        history: Dict[Language, List[Dict]] = {}

        for lang in SUPPORTED_LANGUAGES:
            language = Language(lang)
            record = self._new_code_record(
                language=language,
                content=DEFAULT_CODE_SNIPPETS.get(lang, ""),
                author="system",
            )
            code_by_language[language] = record
            history[language] = [deepcopy(record)]

        self.sessions[session_id] = {
            "session_id": session_id,
            "title": title,
            "created_at": now,
            "last_active_at": now,
            "code_by_language": code_by_language,
            "participants": {},
            "history": history,
        }
        return self.sessions[session_id]

    def _generate_unique_session_id(self) -> str:
        session_id = self._generate_session_id()
        while session_id in self.sessions:
            session_id = self._generate_session_id()
        return session_id

    def get_session(self, session_id: str) -> Dict:
        if session_id not in self.sessions:
            raise KeyError("session not found")
        return self.sessions[session_id]

    def update_code(self, session_id: str, language: Language, content: str, author: Optional[str]) -> Dict:
        session = self.get_session(session_id)
        current = session["code_by_language"].get(language)
        next_version = (current["version"] if current else 0) + 1

        record = self._new_code_record(language=language, content=content, author=author, version=next_version)
        session["code_by_language"][language] = record
        session["history"].setdefault(language, []).append(deepcopy(record))
        session["last_active_at"] = record["updated_at"]
        return record

    def get_code_snapshot(self, session_id: str, language: Optional[Language]) -> Dict[Language, Dict]:
        session = self.get_session(session_id)
        code_by_language = session["code_by_language"]

        if language:
            if language not in code_by_language:
                raise ValueError("language not found")
            return {language: code_by_language[language]}

        return code_by_language

    def get_history(self, session_id: str, language: Optional[Language], limit: int) -> Dict[Language, List[Dict]]:
        session = self.get_session(session_id)
        history = session["history"]

        if language:
            if language not in history:
                raise ValueError("language not found")
            return {language: history[language][-limit:]}

        return {lang: items[-limit:] for lang, items in history.items()}

    def register_participant(self, session_id: str, display_name: Optional[str]) -> Dict:
        session = self.get_session(session_id)
        participant_id = uuid.uuid4().hex[:8]
        now = self._now()
        session["participants"][participant_id] = {
            "participant_id": participant_id,
            "display_name": display_name,
            "joined_at": now,
            "last_seen_at": now,
        }
        session["last_active_at"] = now
        return session["participants"][participant_id]

    def remove_participant(self, session_id: str, participant_id: str) -> None:
        session = self.get_session(session_id)
        session["participants"].pop(participant_id, None)
        session["last_active_at"] = self._now()

    def touch_participant(self, session_id: str, participant_id: str) -> None:
        session = self.get_session(session_id)
        participant = session["participants"].get(participant_id)
        if participant:
            participant["last_seen_at"] = self._now()

    def to_session_model(self, session: Dict) -> Session:
        participants = [
            Participant(
                participantId=pid,
                displayName=data.get("display_name"),
                joinedAt=data["joined_at"],
                lastSeenAt=data["last_seen_at"],
            )
            for pid, data in session.get("participants", {}).items()
        ]

        code_by_language = {
            language: CodeDocument(
                language=language,
                content=record["content"],
                version=record["version"],
                updatedAt=record["updated_at"],
                updatedBy=record.get("updated_by"),
            )
            for language, record in session.get("code_by_language", {}).items()
        }

        return Session(
            sessionId=session["session_id"],
            title=session.get("title"),
            createdAt=session["created_at"],
            lastActiveAt=session["last_active_at"],
            activeParticipants=len(participants),
            codeByLanguage=code_by_language,
            participants=participants,
        )

    def to_participants(self, session: Dict) -> List[Participant]:
        return [
            Participant(
                participantId=pid,
                displayName=data.get("display_name"),
                joinedAt=data["joined_at"],
                lastSeenAt=data["last_seen_at"],
            )
            for pid, data in session.get("participants", {}).items()
        ]

    def to_code_document(self, record: Dict) -> CodeDocument:
        return CodeDocument(
            language=record["language"],
            content=record["content"],
            version=record["version"],
            updatedAt=record["updated_at"],
            updatedBy=record.get("updated_by"),
        )
