"""店舗検索・条件の自動緩和・提示（基本設計書 3.2～3.5）。"""

import random
from datetime import datetime
from typing import Any
from urllib.parse import quote

from .conditions import BUDGET_CODES, BUDGET_ORDER, RANGES, api_genre_codes, matches_appetite
from .hotpepper import HotPepperClient
from .opening_hours import OpenStatus, open_status
from .schemas import ResultType, SearchRequest, SearchResponse, Shop

MAX_PRESENT = 3


def to_shop(raw: dict[str, Any], status: OpenStatus) -> Shop:
    address = raw.get("address", "")
    return Shop(
        id=raw["id"],
        name=raw.get("name", ""),
        genre=raw.get("genre", {}).get("name", ""),
        address=address,
        access=raw.get("mobile_access") or raw.get("access", ""),
        budget=raw.get("budget", {}).get("average") or raw.get("budget", {}).get("name", ""),
        open=raw.get("open", ""),
        open_status=status,
        photo_url=raw.get("photo", {}).get("pc", {}).get("l"),
        url=raw.get("urls", {}).get("pc"),
        map_url="https://www.google.com/maps/search/?api=1&query=" + quote(address),
    )


def _filter(raw_shops: list[dict[str, Any]], req: SearchRequest, now: datetime) -> list[Shop]:
    shops = []
    for raw in raw_shops:
        genre_code = raw.get("genre", {}).get("code", "")
        sub_code = raw.get("sub_genre", {}).get("code")
        if req.genre and req.genre not in (genre_code, sub_code):
            continue
        if not matches_appetite(req.appetite, genre_code, sub_code):
            continue
        status = open_status(raw.get("open", ""), now)
        # 営業時間を解釈できない店舗は除外せず、open_status で利用者に知らせる
        if status is OpenStatus.CLOSED:
            continue
        shops.append(to_shop(raw, status))
    return shops


async def search_shops(
    client: HotPepperClient,
    req: SearchRequest,
    lat: float,
    lng: float,
    now: datetime,
    rng: random.Random | None = None,
) -> SearchResponse:
    rng = rng or random.Random()
    genres = api_genre_codes(req.appetite, req.genre)

    # 3.4 条件の自動緩和：範囲を300m→2kmへ広げ、なければ予算を一段階上げて300mからやり直す
    matches: list[Shop] = []
    budget = req.budget
    meters = RANGES[0][1]
    for budget in BUDGET_ORDER[BUDGET_ORDER.index(req.budget) :]:
        for range_code, meters in RANGES:
            raw = await client.search(lat, lng, range_code, genres, BUDGET_CODES[budget])
            matches = _filter(raw, req, now)
            if matches:
                break
        if matches:
            break

    relaxed = budget is not req.budget or meters != RANGES[0][1]
    common = {"applied_budget": budget, "applied_range_m": meters, "relaxed": relaxed}

    if not matches:
        return SearchResponse(
            result=ResultType.NOT_FOUND,
            shops=[],
            remaining=0,
            message="条件に合うお店が見つかりませんでした。ジャンルを変えて探してみてください。",
            **common,
        )

    # 3.3 シャッフル：提示済みの店舗を除外する
    presented = set(req.presented_ids)
    unseen = [shop for shop in matches if shop.id not in presented]
    if unseen:
        picked = rng.sample(unseen, min(MAX_PRESENT, len(unseen)))
        message = "お店を選んでください。"
        if relaxed:
            message = f"条件を広げて探しました（{meters}m以内）。" + message
        return SearchResponse(
            result=ResultType.CANDIDATES,
            shops=picked,
            remaining=len(unseen) - len(picked),
            message=message,
            **common,
        )

    # 未提示の候補がなくなったら、提示済みの店舗から1件を「ここ！」として提示する
    seen = [shop for shop in matches if shop.id in presented]
    return SearchResponse(
        result=ResultType.FINAL,
        shops=[rng.choice(seen)],
        remaining=0,
        message="ここ！",
        **common,
    )
