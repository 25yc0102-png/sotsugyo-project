import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SearchLog
from app.main import app, get_hotpepper, get_now

from .test_app import WED_19, FakeClient, shop

BODY = {"budget": "any", "appetite": "normal", "lat": 35.68, "lng": 139.76}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("HOTPEPPER_API_KEY", "test-key")
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{(tmp_path / 'test.db').as_posix()}")
    fake = FakeClient({(1, ()): [shop("a"), shop("b")]})
    app.dependency_overrides[get_hotpepper] = lambda: fake
    app.dependency_overrides[get_now] = lambda: WED_19
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def logs() -> list[SearchLog]:
    async def fetch():
        async with app.state.sessions() as session:
            return list((await session.scalars(select(SearchLog))).all())

    return asyncio.run(fetch())


def test_search_is_logged(client):
    res = client.post("/api/search", json={**BODY, "presented_ids": ["x"]})
    assert res.status_code == 200
    data = res.json()
    [log] = logs()
    assert data["log_id"] == log.id
    assert log.budget == "any" and log.location_type == "current" and log.place is None
    assert log.presented_count == 1
    assert sorted(log.shop_ids) == ["a", "b"]


def test_selection(client):
    log_id = client.post("/api/search", json=BODY).json()["log_id"]
    assert client.post(f"/api/search-logs/{log_id}/selection", json={"shop_id": "zzz"}).status_code == 400
    assert client.post("/api/search-logs/unknown/selection", json={"shop_id": "a"}).status_code == 404
    assert client.post(f"/api/search-logs/{log_id}/selection", json={"shop_id": "a"}).status_code == 204
    [log] = logs()
    assert log.selected_shop_id == "a" and log.selected_at is not None
