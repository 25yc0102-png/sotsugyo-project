"""店舗検索・条件の自動緩和・提示（基本設計書 3.2～3.5）。"""

import random
import re
from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from typing import Any
from urllib.parse import quote

from .conditions import BUDGET_CODES, BUDGET_ORDER, RANGES, api_genre_codes, matches_appetite
from .hotpepper import HotPepperClient
from .opening_hours import OpenStatus, open_status
from .schemas import (
    FrontendSearchRequest,
    FrontendSearchResponse,
    FrontendShop,
    ResultType,
    SearchRequest,
    SearchResponse,
    Shop,
)

MAX_PRESENT = 3

FRONTEND_GENRES = {
    "izakaya": ("G001", "居酒屋"),
    "ramen": ("G013", "ラーメン"),
    "cafe": ("G014", "カフェ"),
}
FRONTEND_RANGES = {500: 2, 1000: 3, 2000: 4, 3000: 5}
CUISINE_KEYWORDS = {
    "chinese": ("中華", "中国"),
    "yakitori": ("焼き鳥", "焼鳥", "串焼"),
    "seafood": ("海鮮", "魚介", "寿司"),
    "kushikatsu": ("串揚げ", "串カツ", "串かつ"),
    "washoku": ("和食", "日本料理"),
}
MOOD_KEYWORDS = {
    "calm": ("落ち着", "個室", "静か", "ゆったり"),
    "lively": ("にぎやか", "賑やか", "宴会", "大人数", "活気"),
}


def _distance_meters(lat: float, lng: float, shop_lat: Any, shop_lng: Any) -> int | None:
    if shop_lat is None or shop_lng is None:
        return None
    try:
        target_lat = float(shop_lat)
        target_lng = float(shop_lng)
    except (TypeError, ValueError):
        return None

    lat1, lat2 = radians(lat), radians(target_lat)
    delta_lat = lat2 - lat1
    delta_lng = radians(target_lng - lng)
    haversine = sin(delta_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(delta_lng / 2) ** 2
    return round(6_371_000 * 2 * asin(sqrt(haversine)))


def _average_budget_yen(raw: dict[str, Any]) -> int | None:
    budget = raw.get("budget") or {}
    average = budget.get("average") or ""
    numbers = re.findall(r"\d[\d,]*", average)
    if not numbers:
        return None
    return int(numbers[0].replace(",", ""))


def _matches_frontend_budget(budget_id: str, raw: dict[str, Any]) -> bool:
    if budget_id == "any":
        return True
    amount = _average_budget_yen(raw)
    if amount is None:
        return True
    if budget_id == "under3000":
        return amount <= 3000
    if budget_id == "3001to5000":
        return 3001 <= amount <= 5000
    return 5001 <= amount <= 7000


def _matching_preference(
    text: str,
    selected: list[str],
    keywords: dict[str, tuple[str, ...]],
) -> str | None:
    return next(
        (
            option
            for option in selected
            if any(keyword in text for keyword in keywords[option])
        ),
        None,
    )


def _to_frontend_shop(
    raw: dict[str, Any],
    req: FrontendSearchRequest,
    lat: float,
    lng: float,
) -> tuple[FrontendShop, int]:
    _, genre_label = FRONTEND_GENRES[req.genre]
    genre = raw.get("genre") or {}
    sub_genre = raw.get("sub_genre") or {}
    budget = raw.get("budget") or {}
    photo = raw.get("photo") or {}
    photo_pc = photo.get("pc") or {}
    address = raw.get("address") or ""
    search_text = " ".join(
        str(value)
        for value in (
            raw.get("name", ""),
            raw.get("catch", ""),
            genre.get("name", ""),
            sub_genre.get("name", ""),
        )
    )
    cuisine = _matching_preference(search_text, req.cuisines, CUISINE_KEYWORDS)
    mood = _matching_preference(search_text, req.moods, MOOD_KEYWORDS)
    score = int(cuisine is not None) + int(mood is not None)
    actual_genre_label = genre.get("name") or genre_label
    return (
        FrontendShop(
            id=str(raw["id"]),
            name=raw.get("name") or "店名未設定",
            genre_id=req.genre,
            genre_label=actual_genre_label,
            budget_id=req.budget,
            budget_label=budget.get("average") or budget.get("name") or "予算情報なし",
            station=raw.get("station_name") or "検索地点周辺",
            address=address,
            catch=raw.get("catch") or "店舗の紹介文はありません。",
            distance_meters=_distance_meters(lat, lng, raw.get("lat"), raw.get("lng")),
            cuisine=cuisine,
            mood=mood,
            photo_url=photo_pc.get("l"),
            url=(raw.get("urls") or {}).get("pc"),
            map_url="https://www.google.com/maps/search/?api=1&query=" + quote(address),
        ),
        score,
    )


async def search_frontend_shops(
    client: HotPepperClient,
    req: FrontendSearchRequest,
    lat: float,
    lng: float,
    now: datetime,
) -> FrontendSearchResponse:
    genre_code, _ = FRONTEND_GENRES[req.genre]
    raw_shops = await client.search(
        lat,
        lng,
        FRONTEND_RANGES[req.range_meters],
        [genre_code],
        [],
    )
    shops: list[tuple[FrontendShop, int]] = []
    for raw in raw_shops:
        if not _matches_frontend_budget(req.budget, raw):
            continue
        if open_status(raw.get("open", ""), now) is OpenStatus.CLOSED:
            continue
        shops.append(_to_frontend_shop(raw, req, lat, lng))

    # 好みは必須条件ではなく優先順位として扱い、該当店舗が少なくても候補を表示する。
    shops.sort(key=lambda item: (-item[1], item[0].distance_meters is None, item[0].distance_meters or 0))
    result = [shop for shop, _ in shops]
    message = (
        "条件に合うお店が見つかりませんでした。検索範囲や予算を変えてみてください。"
        if not result
        else f"{len(result)}件のお店が見つかりました。"
    )
    return FrontendSearchResponse(shops=result, message=message)


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
