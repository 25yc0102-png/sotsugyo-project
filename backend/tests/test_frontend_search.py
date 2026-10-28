import asyncio
from datetime import datetime

from fastapi.testclient import TestClient

from app import config
from app.main import app, get_hotpepper
from app.schemas import FrontendSearchRequest
from app.search import search_frontend_shops


class FakeHotPepperClient:
    def __init__(self, shops):
        self.shops = shops
        self.calls = []

    async def search(self, lat, lng, range_code, genres, budgets):
        self.calls.append((lat, lng, range_code, genres, budgets))
        return self.shops


def shop(shop_id, average, catch="", lat=35.681236, lng=139.767125):
    return {
        "id": shop_id,
        "name": shop_id,
        "catch": catch,
        "genre": {"code": "G001", "name": "居酒屋"},
        "sub_genre": {"name": "焼き鳥"},
        "budget": {"average": average},
        "open": "月～日: 11:00～23:00",
        "address": "東京都千代田区",
        "lat": lat,
        "lng": lng,
        "station_name": "東京駅",
        "photo": {"pc": {"l": "https://example.test/shop.jpg"}},
        "urls": {"pc": "https://example.test/shop"},
    }


def request_body(**overrides):
    return {
        "genre": "izakaya",
        "budget": "under3000",
        "rangeMeters": 1000,
        "moods": ["calm"],
        "cuisines": ["yakitori"],
        "lat": 35.681236,
        "lng": 139.767125,
        **overrides,
    }


def test_frontend_search_filters_and_maps_shops():
    client = FakeHotPepperClient(
        [
            shop("matched", "2,500円", "落ち着いた個室の焼き鳥店"),
            shop("over-budget", "4,000円"),
            shop("unknown-budget", ""),
        ]
    )
    req = FrontendSearchRequest.model_validate(request_body())
    response = asyncio.run(
        search_frontend_shops(
            client,
            req,
            35.681236,
            139.767125,
            datetime.fromisoformat("2026-10-28T19:00:00+09:00"),
        )
    )

    assert client.calls == [(35.681236, 139.767125, 3, ["G001"], [])]
    assert [shop.id for shop in response.shops] == ["matched", "unknown-budget"]
    assert response.shops[0].genre_id == "izakaya"
    assert response.shops[0].genre_label == "居酒屋"
    assert response.shops[0].distance_meters == 0
    assert response.shops[0].mood == "calm"
    assert response.shops[0].cuisine == "yakitori"
    assert response.model_dump(by_alias=True)["shops"][0]["distanceMeters"] == 0


def test_frontend_search_endpoint_returns_503_without_api_key(monkeypatch, tmp_path):
    monkeypatch.delenv("HOTPEPPER_API_KEY", raising=False)
    monkeypatch.setattr(config, "KEY_FILE", tmp_path / "missing-api-key")
    app.dependency_overrides.clear()

    with TestClient(app) as client:
        response = client.post("/api/shops/search", json=request_body())
        assert response.status_code == 503
        assert "HOTPEPPER_API_KEY" in response.json()["detail"]
        assert client.get("/api/health").json()["search_configured"] == "false"


def test_frontend_search_endpoint_uses_fake_hotpepper(monkeypatch, tmp_path):
    monkeypatch.setenv("HOTPEPPER_API_KEY", "test-key")
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{(tmp_path / 'test.db').as_posix()}")
    fake = FakeHotPepperClient([shop("sample", "2,500円")])
    app.dependency_overrides[get_hotpepper] = lambda: fake

    try:
        with TestClient(app) as client:
            response = client.post("/api/shops/search", json=request_body())
            assert response.status_code == 200
            data = response.json()
            assert data["shops"][0]["id"] == "sample"
            assert data["shops"][0]["genreId"] == "izakaya"
            assert data["shops"][0]["mapUrl"].startswith("https://www.google.com/maps/")
    finally:
        app.dependency_overrides.clear()


def test_frontend_page_is_served_by_fastapi(monkeypatch, tmp_path):
    monkeypatch.setenv("HOTPEPPER_API_KEY", "test-key")
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{(tmp_path / 'static.db').as_posix()}")

    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert 'id="app"' in response.text
        assert client.get("/app.js").status_code == 200
        assert client.get("/styles.css").status_code == 200
