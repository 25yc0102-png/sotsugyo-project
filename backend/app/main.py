"""めしガチャ APIサーバー。"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .conditions import GENRES
from .config import get_allowed_origins, get_api_key
from .db import SearchLog, create_engine, create_tables, get_database_url
from .geocode import GeocodeError, geocode
from .hotpepper import HotPepperClient, HotPepperError
from .schemas import Genre, SearchRequest, SearchResponse, SelectionRequest
from .search import search_shops

JST = timezone(timedelta(hours=9))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    engine = create_engine(get_database_url())
    await create_tables(engine)
    app.state.sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with httpx.AsyncClient(headers={"User-Agent": "meshi-gacha/0.1"}) as http:
        app.state.http = http
        app.state.hotpepper = HotPepperClient(get_api_key(), http)
        yield
    await engine.dispose()


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


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessions() as session:
        yield session


async def save_log(session: AsyncSession, req: SearchRequest, res: SearchResponse) -> str | None:
    """検索ログを記録する。記録に失敗しても検索結果は返す。"""
    log = SearchLog(
        budget=req.budget,
        appetite=req.appetite,
        genre=req.genre,
        location_type="current" if req.lat is not None else "place",
        place=None if req.lat is not None else req.place,
        presented_count=len(req.presented_ids),
        result=res.result,
        applied_budget=res.applied_budget,
        applied_range_m=res.applied_range_m,
        relaxed=res.relaxed,
        shop_ids=[shop.id for shop in res.shops],
    )
    try:
        session.add(log)
        await session.commit()
    except SQLAlchemyError:
        logger.exception("検索ログの記録に失敗しました。")
        await session.rollback()
        return None
    return log.id


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
    session: AsyncSession = Depends(get_session),
) -> SearchResponse:
    if req.lat is not None and req.lng is not None:
        lat, lng = req.lat, req.lng
    else:
        try:
            lat, lng = await geocode(http, req.place or "")
        except GeocodeError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        res = await search_shops(hotpepper, req, lat, lng, now)
    except HotPepperError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    res.log_id = await save_log(session, req, res)
    return res


@app.post("/api/search-logs/{log_id}/selection", status_code=204)
async def select_shop(
    log_id: str,
    body: SelectionRequest,
    session: AsyncSession = Depends(get_session),
    now: datetime = Depends(get_now),
) -> None:
    """利用者が決定した店舗を検索ログに記録する。"""
    log = await session.get(SearchLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="検索ログが見つかりません。")
    if body.shop_id not in log.shop_ids:
        raise HTTPException(status_code=400, detail="この検索で提示していない店舗です。")
    log.selected_shop_id = body.shop_id
    log.selected_at = now.astimezone(timezone.utc)
    await session.commit()
