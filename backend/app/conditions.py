"""検索条件と、ホットペッパーグルメAPIのコードとの対応（基本設計書 3.1）。"""

from enum import StrEnum


class Budget(StrEnum):
    CHEAP = "cheap"  # なるべく安く：1,000円以下
    MODERATE = "moderate"  # 手頃：1,001～2,000円
    ANY = "any"  # 気にしない：上限なし


class Appetite(StrEnum):
    LIGHT = "light"  # 軽め
    NORMAL = "normal"  # 普通
    HEARTY = "hearty"  # がっつり


# ディナー予算コード（APIの指定は2つまで）
BUDGET_CODES: dict[Budget, list[str]] = {
    Budget.CHEAP: ["B009", "B010"],  # ～500円、501～1000円
    Budget.MODERATE: ["B011", "B001"],  # 1001～1500円、1501～2000円
    Budget.ANY: [],
}

# 3.4 の自動緩和で予算を上げる順序
BUDGET_ORDER = [Budget.CHEAP, Budget.MODERATE, Budget.ANY]

# 腹具合に対応するジャンルコード。「普通」は「軽め」「がっつり」以外のすべて
LIGHT_GENRES = {"G012", "G014"}  # バー・カクテル、カフェ・スイーツ
HEARTY_GENRES = {"G013", "G008"}  # ラーメン、焼肉・ホルモン

# 利用者が指定できるジャンル（ジャンルマスタAPIより）
GENRES: dict[str, str] = {
    "G001": "居酒屋",
    "G002": "ダイニングバー・バル",
    "G003": "創作料理",
    "G004": "和食",
    "G005": "洋食",
    "G006": "イタリアン・フレンチ",
    "G007": "中華",
    "G008": "焼肉・ホルモン",
    "G017": "韓国料理",
    "G009": "アジア・エスニック料理",
    "G010": "各国料理",
    "G011": "カラオケ・パーティ",
    "G012": "バー・カクテル",
    "G013": "ラーメン",
    "G016": "お好み焼き・もんじゃ",
    "G014": "カフェ・スイーツ",
    "G015": "その他グルメ",
}

# 検索範囲（APIの range コードと半径m）。300mから順に拡大する
RANGES: list[tuple[int, int]] = [(1, 300), (2, 500), (3, 1000), (4, 2000)]


def matches_appetite(appetite: Appetite, genre_code: str, sub_genre_code: str | None = None) -> bool:
    """店舗のジャンル・サブジャンルが腹具合に合うか。「普通」はメインジャンルで判定する。"""
    codes = {genre_code, sub_genre_code} - {None}
    if appetite is Appetite.LIGHT:
        return bool(codes & LIGHT_GENRES)
    if appetite is Appetite.HEARTY:
        return bool(codes & HEARTY_GENRES)
    return genre_code not in LIGHT_GENRES | HEARTY_GENRES


def api_genre_codes(appetite: Appetite, genre: str | None) -> list[str]:
    """APIに渡すジャンルコード。空リストはジャンルで絞り込まないことを表す。"""
    if genre:
        return [genre]
    if appetite is Appetite.LIGHT:
        return sorted(LIGHT_GENRES)
    if appetite is Appetite.HEARTY:
        return sorted(HEARTY_GENRES)
    # 「普通」は対象ジャンルが多いため、取得後に除外する
    return []
