"""ホットペッパーグルメ グルメサーチAPIのクライアント。"""

from typing import Any

import httpx

GOURMET_URL = "https://webservice.recruit.co.jp/hotpepper/gourmet/v1/"


class HotPepperError(Exception):
    pass


class HotPepperClient:
    def __init__(self, api_key: str, http: httpx.AsyncClient) -> None:
        self._api_key = api_key
        self._http = http

    async def search(
        self,
        lat: float,
        lng: float,
        range_code: int,
        genres: list[str],
        budgets: list[str],
    ) -> list[dict[str, Any]]:
        """検索地点から近い順に最大100件の店舗を返す。"""
        params: list[tuple[str, str | int | float]] = [
            ("key", self._api_key),
            ("format", "json"),
            ("lat", round(lat, 6)),
            ("lng", round(lng, 6)),
            ("range", range_code),
            ("count", 100),
        ]
        params += [("genre", code) for code in genres]
        params += [("budget", code) for code in budgets]
        try:
            response = await self._http.get(GOURMET_URL, params=params, timeout=10)
            response.raise_for_status()
            results = response.json()["results"]
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise HotPepperError("ホットペッパーグルメAPIへの接続に失敗しました。") from exc
        if "error" in results:
            raise HotPepperError("ホットペッパーグルメAPIがエラーを返しました。")
        return results.get("shop", [])
