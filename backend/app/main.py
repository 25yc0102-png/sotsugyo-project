"""めしガチャ APIサーバー。"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .conditions import GENRES
from .config import get_allowed_origins, get_api_key
from .geocode import GeocodeError, geocode
from .hotpepper import HotPepperClient, HotPepperError
from .schemas import Genre, SearchRequest, SearchResponse
from .search import search_shops

JST = timezone(timedelta(hours=9))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with httpx.AsyncClient(headers={"User-Agent": "meshi-gacha/0.1"}) as http:
        app.state.http = http
        app.state.hotpepper = HotPepperClient(get_api_key(), http)
        yield


app = FastAPI(title="めしガチャ API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def get_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.http


def get_hotpepper(request: Request) -> HotPepperClient:
    return request.app.state.hotpepper


def get_now() -> datetime:
    return datetime.now(JST)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/genres")
async def genres() -> list[Genre]:
    return [Genre(code=code, name=name) for code, name in GENRES.items()]


@app.post("/api/search")
async def search(
    req: SearchRequest,
    http: httpx.AsyncClient = Depends(get_http),
    hotpepper: HotPepperClient = Depends(get_hotpepper),
    now: datetime = Depends(get_now),
) -> SearchResponse:
    if req.lat is not None and req.lng is not None:
        lat, lng = req.lat, req.lng
    else:
        try:
            lat, lng = await geocode(http, req.place or "")
        except GeocodeError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        return await search_shops(hotpepper, req, lat, lng, now)
    except HotPepperError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
