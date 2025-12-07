from typing import Dict, Optional

import socketio
from fastapi import Depends, FastAPI, HTTPException, Path, Query, status
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    CodeDocument,
    CodeHistory,
    CodeSnapshot,
    CreateSessionRequest,
    HealthResponse,
    JoinSessionRequest,
    Language,
    Session,
    SessionPresence,
    UpdateCodeRequest,
)
from .store import MockDatabase


db = MockDatabase()


def get_db() -> MockDatabase:
    return db


# Socket.IO server for live collaboration
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)

fastapi_app = FastAPI(
    title="CodePair API",
    version="0.1.0",
    description="FastAPI backend for the CodePair collaborative editor.",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@fastapi_app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    return HealthResponse()


@fastapi_app.post(
    "/sessions",
    response_model=Session,
    status_code=status.HTTP_201_CREATED,
    tags=["sessions"],
)
async def create_session(
    payload: Optional[CreateSessionRequest] = None, database: MockDatabase = Depends(get_db)
) -> Session:
    payload = payload or CreateSessionRequest()
    try:
        session = database.create_session(session_id=payload.sessionId, title=payload.title)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session already exists")
    return database.to_session_model(session)


@fastapi_app.get("/sessions/{sessionId}", response_model=Session, tags=["sessions"])
async def get_session(
    sessionId: str = Path(..., pattern=r"^[a-z0-9]{6,12}$"),
    database: MockDatabase = Depends(get_db),
) -> Session:
    try:
        session = database.get_session(sessionId)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return database.to_session_model(session)


@fastapi_app.get(
    "/sessions/{sessionId}/code",
    response_model=CodeSnapshot,
    tags=["sessions"],
)
async def get_code_snapshot(
    sessionId: str = Path(..., pattern=r"^[a-z0-9]{6,12}$"),
    language: Optional[Language] = Query(default=None),
    database: MockDatabase = Depends(get_db),
) -> CodeSnapshot:
    try:
        snapshot = database.get_code_snapshot(session_id=sessionId, language=language)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")

    code_documents: Dict[Language, CodeDocument] = {
        lang: database.to_code_document(record) for lang, record in snapshot.items()
    }
    return CodeSnapshot(sessionId=sessionId, codeByLanguage=code_documents)


@fastapi_app.put(
    "/sessions/{sessionId}/code",
    response_model=CodeDocument,
    tags=["sessions"],
)
async def update_code(
    payload: UpdateCodeRequest,
    sessionId: str = Path(..., pattern=r"^[a-z0-9]{6,12}$"),
    database: MockDatabase = Depends(get_db),
) -> CodeDocument:
    try:
        record = database.update_code(
            session_id=sessionId,
            language=payload.language,
            content=payload.content,
            author=payload.author,
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return database.to_code_document(record)


@fastapi_app.post(
    "/sessions/{sessionId}/participants",
    response_model=SessionPresence,
    tags=["sessions"],
)
async def join_session(
    payload: Optional[JoinSessionRequest] = None,
    sessionId: str = Path(..., pattern=r"^[a-z0-9]{6,12}$"),
    database: MockDatabase = Depends(get_db),
) -> SessionPresence:
    payload = payload or JoinSessionRequest()
    try:
        participant = database.register_participant(session_id=sessionId, display_name=payload.displayName)
        session = database.get_session(sessionId)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    participants = database.to_participants(session)
    return SessionPresence(
        sessionId=sessionId,
        participantId=participant["participant_id"],
        activeParticipants=len(participants),
        participants=participants,
    )


@fastapi_app.delete(
    "/sessions/{sessionId}/participants/{participantId}",
    response_model=SessionPresence,
    tags=["sessions"],
)
async def leave_session(
    sessionId: str = Path(..., pattern=r"^[a-z0-9]{6,12}$"),
    participantId: str = Path(...),
    database: MockDatabase = Depends(get_db),
) -> SessionPresence:
    try:
        database.remove_participant(session_id=sessionId, participant_id=participantId)
        session = database.get_session(sessionId)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    participants = database.to_participants(session)
    return SessionPresence(
        sessionId=sessionId,
        participantId=None,
        activeParticipants=len(participants),
        participants=participants,
    )


@fastapi_app.get(
    "/sessions/{sessionId}/history",
    response_model=CodeHistory,
    tags=["sessions"],
)
async def get_history(
    sessionId: str = Path(..., pattern=r"^[a-z0-9]{6,12}$"),
    language: Optional[Language] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    database: MockDatabase = Depends(get_db),
) -> CodeHistory:
    try:
        revisions = database.get_history(session_id=sessionId, language=language, limit=limit)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")

    serialized = {lang: [database.to_code_document(item) for item in items] for lang, items in revisions.items()}
    return CodeHistory(sessionId=sessionId, revisions=serialized, limit=limit)


# Attach Socket.IO under /socket.io to stay compatible with the existing client hook
fastapi_app.mount("/socket.io", socket_app)
app = fastapi_app


# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    return True


@sio.event
async def disconnect(sid):
    # The mock DB does not track socket participant IDs separately yet
    pass


@sio.on("join")
async def join_room(sid, data):
    session_id = (data or {}).get("sessionId")
    if not session_id:
        return

    # Ensure the session exists so Socket.IO-only flows still work
    try:
        db.get_session(session_id)
    except KeyError:
        db.create_session(session_id=session_id, title=None)

    await sio.enter_room(sid, session_id)


@sio.on("join:session")
async def join_room_compat(sid, data):
    await join_room(sid, data)


@sio.on("code:update")
async def relay_code_update(sid, data):
    session_id = (data or {}).get("sessionId")
    code = (data or {}).get("code")
    if not session_id or code is None:
        return

    # Broadcast to all other participants in the same session
    await sio.emit("code:update", data, room=session_id, skip_sid=sid)
