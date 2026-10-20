"""営業時間（自由記述）の判定。

ホットペッパーの open は「月～金: 11:00～23:00 （料理L.O. 22:00）土、日: 11:00～22:00」の形式が多い。
この形式を解釈し、現在営業中で閉店まで指定時間以上あるかを判定する。
祝日・祝前日の指定は、祝日の判定手段がないため無視する（基本設計書 6 の検討事項）。
"""

import re
from datetime import datetime, timedelta
from enum import StrEnum

WEEKDAYS = "月火水木金土日"

_PAREN = re.compile(r"[（(][^）)]*[）)]")
_SEGMENT = re.compile(r"([月火水木金土日祝前、～・\s]+?)\s*[:：]\s*((?:\s*[、,]?\s*翌?\d{1,2}[:：]\d{2}\s*[～〜~-]\s*翌?\d{1,2}[:：]\d{2})+)")
_TIME_RANGE = re.compile(r"(翌?)(\d{1,2})[:：](\d{2})\s*[～〜~-]\s*(翌?)(\d{1,2})[:：](\d{2})")


class OpenStatus(StrEnum):
    OPEN = "open"  # 営業中で、閉店まで十分な時間がある
    CLOSED = "closed"  # 営業時間外、または閉店まで時間がない
    UNKNOWN = "unknown"  # 営業時間を解釈できない


def _parse_days(text: str) -> set[int]:
    days: set[int] = set()
    for part in re.split(r"[、・\s]+", text):
        part = part.strip()
        if not part or part.startswith("祝"):
            continue
        if "～" in part:
            start, _, end = part.partition("～")
            if start in WEEKDAYS and end in WEEKDAYS:
                i, j = WEEKDAYS.index(start), WEEKDAYS.index(end)
                days.update((i + k) % 7 for k in range((j - i) % 7 + 1))
        elif part in WEEKDAYS:
            days.add(WEEKDAYS.index(part))
    return days


def parse_open(text: str) -> dict[int, list[tuple[int, int]]] | None:
    """曜日（月=0）ごとの営業時間帯（0時からの分。翌日分は1440以上）を返す。解釈できなければ None。"""
    cleaned = _PAREN.sub(" ", text or "")
    schedule: dict[int, list[tuple[int, int]]] = {}
    for day_text, times_text in _SEGMENT.findall(cleaned):
        days = _parse_days(day_text)
        for next1, h1, m1, next2, h2, m2 in _TIME_RANGE.findall(times_text):
            start = int(h1) * 60 + int(m1) + (1440 if next1 else 0)
            end = int(h2) * 60 + int(m2) + (1440 if next2 else 0)
            if end <= start:  # 「18:00～2:00」のような日付またぎ
                end += 1440
            for day in days:
                schedule.setdefault(day, []).append((start, end))
    return schedule or None


def open_status(text: str, now: datetime, min_remaining: timedelta = timedelta(hours=1)) -> OpenStatus:
    schedule = parse_open(text)
    if schedule is None:
        return OpenStatus.UNKNOWN
    minute = now.hour * 60 + now.minute
    today = now.weekday()
    yesterday = (today - 1) % 7
    # 当日の営業時間帯と、前日から日付をまたいで続く営業時間帯を確認する
    candidates = [(s, e, minute) for s, e in schedule.get(today, [])]
    candidates += [(s, e, minute + 1440) for s, e in schedule.get(yesterday, [])]
    need = min_remaining.total_seconds() / 60
    for start, end, current in candidates:
        if start <= current and end - current >= need:
            return OpenStatus.OPEN
    return OpenStatus.CLOSED
