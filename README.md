# まちメシ 卒業制作サンプル

エリア・料理ジャンル・予算の3問に答えると、ホットペッパーグルメ Webサービス API から店舗候補を検索するローカル Web アプリです。

## 画面の流れ

1. エリアを選択
2. 料理ジャンルを選択
3. 予算の目安を選択
4. API の検索結果を確認し、「条件を変更」から再検索

店舗名、ジャンル、最寄り駅、住所、予算、写真、ホットペッパーの店舗詳細リンクを表示します。利用する情報は API の応答に基づきます。

## ローカルでの起動

PowerShell でこのフォルダーを開き、設定ファイルを作成します。

```powershell
Copy-Item hotpepper-config.example.js hotpepper-config.js
```

`hotpepper-config.js` のプレースホルダーを自分の API キーに置き換え、`index.html` をブラウザーで開きます。追加のライブラリやビルド手順はありません。

## API キーと公開について

`hotpepper-config.js` は `.gitignore` で除外されます。API キーはブラウザーから確認できるため、このサンプルを実キー入りのまま公開・デプロイしないでください。公開環境で利用する場合は、キーをサーバー側で保持する API プロキシを用意してください。

## API 表記

検索結果には「Powered by ホットペッパーグルメ Webサービス」を表示し、API 由来の写真には画像提供元を表示しています。利用時は [公式ガイドライン](https://webservice.recruit.co.jp/doc/hotpepper/guideline.html) と [API リファレンス](https://webservice.recruit.co.jp/doc/hotpepper/reference.html) を確認してください。

## リポジトリ構成

- `index.html`: 3問で検索する軽量な画面サンプル
- `hotpepper-config.example.js`: ローカル設定ファイルのひな形
- `gourmet-nearby/`: 既存のローカルサーバー版アプリ
- `基本設計書.md`: 制作の基本設計