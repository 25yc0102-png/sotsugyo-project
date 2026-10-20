# めしガチャ API（FastAPI）

[基本設計書改定](../基本設計書改定.md) の店舗検索（3.2～3.5）を担うAPIサーバーです。

## 起動

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

APIキーは環境変数 `HOTPEPPER_API_KEY`、またはリポジトリ直下の `.env/hotpepper_api` から読み込みます。
CORSで許可するオリジンは `ALLOWED_ORIGINS`（カンマ区切り、既定は Vite 開発サーバー）で変更できます。

APIドキュメントは http://localhost:8000/docs で確認できます。

## エンドポイント

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/api/health` | 稼働確認 |
| GET | `/api/genres` | 指定できるジャンルの一覧 |
| POST | `/api/search` | 店舗検索・シャッフル |

`/api/search` のリクエスト例：

```json
{
  "budget": "cheap",
  "appetite": "hearty",
  "lat": 35.681236,
  "lng": 139.767125,
  "genre": "G013",
  "presented_ids": []
}
```

- `budget`：`cheap`（なるべく安く）、`moderate`（手頃）、`any`（気にしない）
- `appetite`：`light`（軽め）、`normal`（普通）、`hearty`（がっつり）
- 検索地点は `lat`・`lng`、または `place`（地名・駅名）で指定する
- シャッフル時は、それまでに提示した店舗IDを `presented_ids` に入れて同じ条件で呼ぶ

レスポンスの `result` は次のいずれかです。

- `candidates`：未提示の候補を2～3件提示
- `final`：未提示の候補がないため、提示済みの店舗から1件を「ここ！」として提示
- `not_found`：条件を緩和しても見つからない（ジャンルの変更を促す）

## テスト

```powershell
.\.venv\Scripts\python -m pytest
```

## 暫定の仕様

基本設計書「6. 今後の検討事項」のうち、次の項目は暫定の仕様で実装しています。

- 営業時間：`open` の「曜日: HH:MM～HH:MM」形式を解釈する。祝日の指定は無視する。解釈できない店舗は除外せず、`open_status: "unknown"` として返す
- 腹具合：軽め＝バー・カクテル、カフェ・スイーツ／がっつり＝ラーメン、焼肉・ホルモン／普通＝それ以外
- 予算：なるべく安く＝B009・B010、手頃＝B011・B001
- 地名・駅名：Photon（OpenStreetMap）で緯度・経度を取得する
- 提示済み店舗：サーバーでは保持せず、クライアントが `presented_ids` で送る（DB不要）
