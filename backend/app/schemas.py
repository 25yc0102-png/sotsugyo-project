from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .conditions import GENRES, Appetite, Budget
from .opening_hours import OpenStatus


class SearchRequest(BaseModel):
    budget: Budget
    appetite: Appetite
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    place: str | None = Field(default=None, max_length=100, description="地名または駅名")
    genre: str | None = Field(default=None, description="ジャンルコード（G001 など）")
    presented_ids: list[str] = Field(
        default_factory=list, max_length=200, description="これまでに提示した店舗ID（シャッフル時に指定）"
    )

    @model_validator(mode="after")
    def check(self) -> "SearchRequest":
        if self.place:
            self.place = self.place.strip()
        if (self.lat is None) != (self.lng is None):
            raise ValueError("lat と lng は両方指定してください。")
        if self.lat is None and not self.place:
            raise ValueError("現在地（lat, lng）または地名・駅名（place）を指定してください。")
        if self.genre is not None and self.genre not in GENRES:
            raise ValueError("ジャンルコードが不正です。")
        return self


class FrontendSearchRequest(BaseModel):
    """Vue 3 の検索フォームから受け取る検索条件。"""

    model_config = ConfigDict(populate_by_name=True)

    genre: Literal["izakaya", "ramen", "cafe"]
    budget: Literal["under3000", "3001to5000", "5001to7000", "any"]
    range_meters: Literal[500, 1000, 2000, 3000] = Field(alias="rangeMeters")
    moods: list[str] = Field(default_factory=list, max_length=2)
    cuisines: list[str] = Field(default_factory=list, max_length=5)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    place: str | None = Field(default=None, min_length=2, max_length=100)

    @model_validator(mode="after")
    def check(self) -> "FrontendSearchRequest":
        if (self.lat is None) != (self.lng is None):
            raise ValueError("lat と lng は両方指定してください。")
        if self.lat is None and not (self.place and self.place.strip()):
            raise ValueError("現在地または地名・駅名を指定してください。")
        if any(mood not in {"calm", "lively"} for mood in self.moods):
            raise ValueError("雰囲気の選択が不正です。")
        if any(cuisine not in {"chinese", "yakitori", "seafood", "kushikatsu", "washoku"} for cuisine in self.cuisines):
            raise ValueError("料理・店の種類の選択が不正です。")
        if self.place:
            self.place = self.place.strip()
        return self


class FrontendShop(BaseModel):
    """Vue 3 の店舗カード・スロット表示用の店舗情報。"""

    id: str
    name: str
    genre_id: str = Field(serialization_alias="genreId")
    genre_label: str = Field(serialization_alias="genreLabel")
    budget_id: str = Field(serialization_alias="budgetId")
    budget_label: str = Field(serialization_alias="budgetLabel")
    station: str
    address: str
    catch: str
    distance_meters: int | None = Field(serialization_alias="distanceMeters")
    cuisine: str | None
    mood: str | None
    photo_url: str | None = Field(serialization_alias="photoUrl")
    url: str | None
    map_url: str = Field(serialization_alias="mapUrl")


class FrontendSearchResponse(BaseModel):
    shops: list[FrontendShop]
    message: str


class Shop(BaseModel):
    id: str
    name: str
    genre: str
    address: str
    access: str
    budget: str
    open: str
    open_status: OpenStatus
    photo_url: str | None
    url: str | None
    map_url: str


class ResultType(StrEnum):
    CANDIDATES = "candidates"  # 未提示の候補を2～3件提示
    FINAL = "final"  # 未提示の候補がないため、提示済みから1件を「ここ！」として提示
    NOT_FOUND = "not_found"  # 条件を緩和しても見つからない


class SearchResponse(BaseModel):
    result: ResultType
    shops: list[Shop]
    applied_budget: Budget
    applied_range_m: int
    relaxed: bool
    remaining: int = Field(description="未提示の候補数（今回提示した分を除く）")
    message: str
    log_id: str | None = Field(default=None, description="検索ログのID。店舗決定時に使う（記録に失敗した場合は null）")


class SelectionRequest(BaseModel):
    shop_id: str = Field(max_length=32)


class Genre(BaseModel):
    code: str
    name: str
