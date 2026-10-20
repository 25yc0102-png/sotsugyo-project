"""データベース（検索ログ）。

本番は Amazon RDS for PostgreSQL、開発中は SQLite を使う。接続先は次の順で決める。

1. DATABASE_URL（例：postgresql+asyncpg://user:pass@host:5432/meshigacha）
2. DB_SECRET_ID（Secrets Manager のシークレット。username・password を含む）と DB_HOST・DB_PORT・DB_NAME
3. どちらもなければ backend/meshi_gacha.db（SQLite）
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

SQLITE_PATH = Path(__file__).resolve().parents[1] / "meshi_gacha.db"


class Base(DeclarativeBase):
    pass


class SearchLog(Base):
    """1回の検索（シャッフルを含む）の条件と結果。緯度・経度は保存しない。"""

    __tablename__ = "search_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # 時刻はUTCで保存する
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    # 入力条件
    budget: Mapped[str] = mapped_column(String(16))
    appetite: Mapped[str] = mapped_column(String(16))
    genre: Mapped[str | None] = mapped_column(String(8))
    location_type: Mapped[str] = mapped_column(String(16))  # current（現在地）または place（地名・駅名）
    place: Mapped[str | None] = mapped_column(String(100))
    presented_count: Mapped[int] = mapped_column(Integer)  # 0 なら初回検索、1以上ならシャッフル

    # 結果
    result: Mapped[str] = mapped_column(String(16))
    applied_budget: Mapped[str] = mapped_column(String(16))
    applied_range_m: Mapped[int] = mapped_column(Integer)
    relaxed: Mapped[bool] = mapped_column(Boolean)
    shop_ids: Mapped[list[str]] = mapped_column(JSON)

    # 利用者が決定した店舗（3.5）
    selected_shop_id: Mapped[str | None] = mapped_column(String(32))
    selected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


def _url_from_secret(secret_id: str) -> URL:
    import boto3  # 本番（RDS）でのみ使う

    client = boto3.client("secretsmanager")
    secret = json.loads(client.get_secret_value(SecretId=secret_id)["SecretString"])
    return URL.create(
        "postgresql+asyncpg",
        username=secret["username"],
        password=secret["password"],
        host=secret.get("host") or os.environ["DB_HOST"],
        port=int(secret.get("port") or os.environ.get("DB_PORT", "5432")),
        database=secret.get("dbname") or os.environ.get("DB_NAME", "meshigacha"),
    )


def get_database_url() -> str | URL:
    if url := os.environ.get("DATABASE_URL"):
        return url
    if secret_id := os.environ.get("DB_SECRET_ID"):
        return _url_from_secret(secret_id)
    return f"sqlite+aiosqlite:///{SQLITE_PATH.as_posix()}"


def create_engine(url: str | URL) -> AsyncEngine:
    kwargs = {}
    if not str(url).startswith("sqlite"):
        # RDS の再起動やフェイルオーバー後に切れた接続を使わないようにする
        kwargs = {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 5}
    return create_async_engine(url, **kwargs)


async def create_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
