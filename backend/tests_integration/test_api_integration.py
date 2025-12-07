import os
from datetime import timedelta
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Configure a dedicated sqlite DB before importing the app
TEST_DB_PATH = Path(__file__).parent / "codepair_integration.db"
TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import Participant  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True, scope="function")
async def reset_db():
  # Drop and recreate tables to isolate each test
  async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.drop_all)
    await conn.run_sync(Base.metadata.create_all)
  original_ttl = os.environ.get("PARTICIPANT_TTL_SECONDS")
  yield
  if original_ttl is not None:
    os.environ["PARTICIPANT_TTL_SECONDS"] = original_ttl
  else:
    os.environ.pop("PARTICIPANT_TTL_SECONDS", None)


def client():
  return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


@pytest.mark.asyncio
async def test_create_and_get_session():
  async with client() as http:
    create_resp = await http.post("/sessions", json={"sessionId": "abc123", "title": "Demo"})
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["sessionId"] == "abc123"
    assert set(created["codeByLanguage"].keys()) == {"javascript", "python", "sql"}

    get_resp = await http.get("/sessions/abc123")
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched["title"] == "Demo"
    assert fetched["activeParticipants"] == 0


@pytest.mark.asyncio
async def test_update_code_and_snapshot():
  async with client() as http:
    await http.post("/sessions", json={"sessionId": "room01"})
    update_resp = await http.put(
      "/sessions/room01/code",
      json={"language": "python", "content": "print('hi')", "author": "tester"},
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["version"] == 2
    assert updated["updatedBy"] == "tester"

    snapshot_resp = await http.get("/sessions/room01/code", params={"language": "python"})
    assert snapshot_resp.status_code == 200
    snapshot = snapshot_resp.json()
    assert snapshot["codeByLanguage"]["python"]["content"] == "print('hi')"


@pytest.mark.asyncio
async def test_history_limit():
  async with client() as http:
    await http.post("/sessions", json={"sessionId": "history1"})
    for i in range(3):
      await http.put(
        "/sessions/history1/code",
        json={"language": "javascript", "content": f"console.log({i});"},
      )

    history_resp = await http.get("/sessions/history1/history", params={"language": "javascript", "limit": 2})
    assert history_resp.status_code == 200
    history = history_resp.json()
    versions = [item["version"] for item in history["revisions"]["javascript"]]
    assert versions == [3, 4]


@pytest.mark.asyncio
async def test_join_and_leave_participants():
  async with client() as http:
    await http.post("/sessions", json={"sessionId": "people1"})
    join_resp = await http.post("/sessions/people1/participants", json={"displayName": "Alice"})
    assert join_resp.status_code == 200
    joined = join_resp.json()
    participant_id = joined["participantId"]
    assert joined["activeParticipants"] == 1
    assert joined["participants"][0]["displayName"] == "Alice"

    leave_resp = await http.delete(f"/sessions/people1/participants/{participant_id}")
    assert leave_resp.status_code == 200
    left = leave_resp.json()
    assert left["activeParticipants"] == 0


@pytest.mark.asyncio
async def test_prunes_stale_participants():
  os.environ["PARTICIPANT_TTL_SECONDS"] = "1"
  async with client() as http:
    await http.post("/sessions", json={"sessionId": "stale1"})
    join_resp = await http.post("/sessions/stale1/participants", json={"displayName": "Old"})
    participant_id = join_resp.json()["participantId"]

  # Manually age the participant
  async with SessionLocal() as session:
    participant = await session.get(Participant, participant_id)
    assert participant
    participant.last_seen_at = participant.last_seen_at.replace(second=0)
    participant.last_seen_at = participant.last_seen_at - timedelta(minutes=10)
    await session.commit()

  async with client() as http:
    resp = await http.get("/sessions/stale1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["activeParticipants"] == 0
