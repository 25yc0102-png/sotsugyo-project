import asyncio
import random
from datetime import datetime, timedelta, timezone

import pytest

from app.conditions import Appetite, Budget
from app.opening_hours import OpenStatus, open_status
from app.schemas import ResultType, SearchRequest
from app.search import search_shops

JST = timezone(timedelta(hours=9))
# 2026-10-21 は水曜日
WED_19 = datetime(2026, 10, 21, 19, 0, tzinfo=JST)


def shop(id_: str, genre: str = "G001", open_: str = "月～日: 11:00～23:00") -> dict:
    return {"id": id_, "name": id_, "genre": {"code": genre}, "open": open_, "address": "東京都千代田区"}


class FakeClient:
    """(range_code, 予算コード) ごとに返す店舗を決めておくクライアント。"""

    def __init__(self, table: dict[tuple[int, tuple[str, ...]], list[dict]]) -> None:
        self.table = table
        self.calls: list[tuple[int, tuple[str, ...], tuple[str, ...]]] = []

    async def search(self, lat, lng, range_code, genres, budgets):
        self.calls.append((range_code, tuple(genres), tuple(budgets)))
        return self.table.get((range_code, tuple(budgets)), [])


def run(client, now=WED_19, rng=None, **kwargs):
    req = SearchRequest(lat=35.68, lng=139.76, **kwargs)
    return asyncio.run(search_shops(client, req, 35.68, 139.76, now, rng or random.Random(0)))


@pytest.mark.parametrize(
    ("text", "now", "expected"),
    [
        ("月～日、祝日、祝前日: 11:00～23:00 （料理L.O. 22:00）", WED_19, OpenStatus.OPEN),
        ("月～日: 11:00～19:30", WED_19, OpenStatus.CLOSED),  # 閉店まで1時間未満
        ("月～金: 11:00～14:00、17:00～23:00土、日: 11:00～21:00", WED_19, OpenStatus.OPEN),
        ("月～火、木～日: 11:00～23:00", WED_19, OpenStatus.CLOSED),  # 水曜定休
        ("火: 18:00～翌3:00", datetime(2026, 10, 22, 1, 0, tzinfo=JST), OpenStatus.CLOSED),
        ("水: 18:00～翌3:00", datetime(2026, 10, 22, 1, 0, tzinfo=JST), OpenStatus.OPEN),  # 前日からの営業
        ("水: 18:00～2:00", datetime(2026, 10, 21, 23, 30, tzinfo=JST), OpenStatus.OPEN),
        ("不定休のため要確認", WED_19, OpenStatus.UNKNOWN),
    ],
)
def test_open_status(text, now, expected):
    assert open_status(text, now) is expected


def test_relax_range_then_budget():
    client = FakeClient({(1, ("B011", "B001")): [shop("a")]})
    res = run(client, budget=Budget.CHEAP, appetite=Appetite.NORMAL)
    # 安い予算で 300m～2km を探した後、手頃に上げて 300m から再検索する
    assert [c[0] for c in client.calls] == [1, 2, 3, 4, 1]
    assert res.result is ResultType.CANDIDATES
    assert res.applied_budget is Budget.MODERATE
    assert res.applied_range_m == 300
    assert res.relaxed


def test_not_found_after_all_relaxation():
    client = FakeClient({})
    res = run(client, budget=Budget.ANY, appetite=Appetite.NORMAL)
    assert len(client.calls) == 4  # 「気にしない」は範囲のみ拡大
    assert res.result is ResultType.NOT_FOUND


def test_appetite_and_closed_filtering():
    shops = [shop("bar", "G012"), shop("ramen", "G013"), shop("closed", open_="月～日: 11:00～14:00"), shop("ok")]
    client = FakeClient({(1, ()): shops})
    res = run(client, budget=Budget.ANY, appetite=Appetite.NORMAL)
    assert [s.id for s in res.shops] == ["ok"]
    assert client.calls[0][1] == ()  # 「普通」はAPIでジャンルを絞らない


def test_shuffle_excludes_presented_then_final():
    shops = [shop(str(i)) for i in range(5)]
    client = FakeClient({(1, ()): shops})
    first = run(client, budget=Budget.ANY, appetite=Appetite.NORMAL)
    assert len(first.shops) == 3 and first.remaining == 2
    seen = [s.id for s in first.shops]
    second = run(client, budget=Budget.ANY, appetite=Appetite.NORMAL, presented_ids=seen)
    assert len(second.shops) == 2 and not set(seen) & {s.id for s in second.shops}
    seen += [s.id for s in second.shops]
    final = run(client, budget=Budget.ANY, appetite=Appetite.NORMAL, presented_ids=seen)
    assert final.result is ResultType.FINAL and len(final.shops) == 1


def test_request_requires_location():
    with pytest.raises(ValueError):
        SearchRequest(budget=Budget.ANY, appetite=Appetite.NORMAL)
