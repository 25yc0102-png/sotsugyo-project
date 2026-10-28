"""地名・駅名から緯度・経度を求める（Photon / OpenStreetMap を使用）。

基本設計書 6 で方法は未決定のため、既存の meshi-gacha と同じ Photon を暫定的に使う。
"""

import httpx

PHOTON_URL = "https://photon.komoot.io/api/"


class GeocodeError(Exception):
    pass


async def geocode(http: httpx.AsyncClient, place: str) -> tuple[float, float]:
    try:
        response = await http.get(
            PHOTON_URL,
            params={"q": place, "limit": 1, "lang": "default", "lat": 35.68, "lon": 139.76},
            timeout=10,
        )
        response.raise_for_status()
        features = response.json().get("features", [])
    except (httpx.HTTPError, ValueError) as exc:
        raise GeocodeError("地名の検索に失敗しました。") from exc
    if not features:
        raise GeocodeError(f"「{place}」の場所が見つかりませんでした。")
    lng, lat = features[0]["geometry"]["coordinates"]
    return lat, lng
