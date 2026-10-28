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
| POST | `/api/search` | 店舗検索・シャッフル（検索ログを記録） |
| POST | `/api/search-logs/{log_id}/selection` | 利用者が決定した店舗を記録 |

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

店舗を決定したら、検索レスポンスの `log_id` を使って `/api/search-logs/{log_id}/selection` に `{"shop_id": "J001234567"}` を送ります。

## データベース（検索ログ）

検索のたびに `search_logs` テーブルへ1行記録します。テーブルは起動時に自動で作成します。

| 列 | 内容 |
| --- | --- |
| `id` | ログID（UUID） |
| `created_at` | 検索日時（UTC） |
| `budget`・`appetite`・`genre` | 入力条件 |
| `location_type`・`place` | `current`（現在地）または `place`（地名・駅名）。緯度・経度は保存しない |
| `presented_count` | 提示済み店舗数。0なら初回検索、1以上ならシャッフル |
| `result`・`applied_budget`・`applied_range_m`・`relaxed` | 結果と、自動緩和後の条件 |
| `shop_ids` | 提示した店舗ID |
| `selected_shop_id`・`selected_at` | 利用者が決定した店舗と日時（UTC） |

ログの記録に失敗しても検索結果は返します（`log_id` は `null`）。

接続先は次の順で決まります。

1. `DATABASE_URL`（例：`postgresql+asyncpg://user:pass@localhost:5432/meshigacha`）
2. `DB_SECRET_ID`（Secrets Manager のシークレットID）と `DB_HOST`・`DB_PORT`・`DB_NAME`。本番のRDSではこちらを使い、EC2のIAMロールに `secretsmanager:GetSecretValue` を許可する
3. どちらもなければ `backend/meshi_gacha.db`（SQLite、開発用）

集計の例（PostgreSQL）：

```sql
-- 条件ごとの検索数（シャッフルを除く）、シャッフル回数、店舗の決定数
SELECT budget, appetite,
       count(*) FILTER (WHERE presented_count = 0) AS searches,
       count(*) FILTER (WHERE presented_count > 0) AS shuffles,
       count(selected_shop_id) AS selections
FROM search_logs
GROUP BY budget, appetite
ORDER BY searches DESC;
```

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
