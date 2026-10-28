"""アプリケーション設定。"""

import os
from functools import lru_cache
from pathlib import Path

# リポジトリ直下の .env/hotpepper_api（APIキーのみを記載したファイル）
KEY_FILE = Path(__file__).resolve().parents[2] / ".env" / "hotpepper_api"


@lru_cache
def get_api_key() -> str:
    """ホットペッパーグルメAPIのキーを返す。

    環境変数 HOTPEPPER_API_KEY を優先し、なければ .env/hotpepper_api を読む。
    """
    key = os.environ.get("HOTPEPPER_API_KEY", "").strip()
    if not key and KEY_FILE.is_file():
        key = KEY_FILE.read_text(encoding="utf-8").strip()
    if not key:
        raise RuntimeError(
            "APIキーが設定されていません。HOTPEPPER_API_KEY または .env/hotpepper_api を設定してください。"
        )
    return key


def get_allowed_origins() -> list[str]:
    """CORSで許可するオリジン。カンマ区切りで ALLOWED_ORIGINS に指定する。"""
    raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
