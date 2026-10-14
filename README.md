# めしガチャ

近くのお店を探して、候補から次のお店を3店抽選する Web アプリです。ジャンル・予算・検索範囲を選び、居酒屋では雰囲気や料理の好みも指定できます。

## 公開ページ

画面は [GitHub Pages](https://25yc0102-png.github.io/sotsugyo-project/) で公開しています。Pages では静的な画面のみ利用でき、店舗検索には対応していません。検索には API キーを安全に扱うサーバーが必要です。

## ローカルで使う

Windows の PowerShell でリポジトリを clone し、次を実行してください。

```powershell
Set-Location .\meshi-gacha
Set-ExecutionPolicy -Scope Process Bypass -Force
.\server.ps1
```

1. 起動時に表示される入力欄へホットペッパーグルメ Webサービスの API キーを入力して Enter を押します。入力したキーは画面に表示されません。
2. 起動時に表示される URL（通常は `http://127.0.0.1:5180/`）をブラウザーで開きます。
3. 位置情報を許可するか、住所・駅名から検索地点を指定します。ジャンル、予算、検索範囲などを選択し、「めしガチャを回す」を押してください。
4. 結果画面のレバーから、候補の中で別の3店を抽選できます。条件を変える場合は「条件を変える」を押します。

ポート `5180` が使用中の場合は、`5181` から `5189` の空いているポートを自動で使用します。位置情報が使えない場合も、住所や駅名から検索できます。

## API キーとプライバシー

API キーはサーバー起動時に入力し、ローカルサーバーのメモリー内だけに保持します。サーバーを停止すると消去され、HTML・JavaScript・ブラウザーの保存領域には書き込みません。サーバーは `127.0.0.1` のみに bind します。API キーをソースコードや公開ページに記載しないでください。

現在地検索にはブラウザーの位置情報許可が必要です。地名検索には Photon と OpenStreetMap のデータを使用します。

## 使用技術とデータ表記

- HTML、CSS、JavaScript
- API サーバー: PowerShell スクリプト
- 店舗情報: [ホットペッパーグルメ Webサービス](https://webservice.recruit.co.jp/)
- 地名検索: [Photon](https://photon.komoot.io/) / [OpenStreetMap](https://www.openstreetmap.org/copyright)

ホットペッパーグルメ Webサービスの利用規約と[公式ガイドライン](https://webservice.recruit.co.jp/doc/hotpepper/guideline.html)に従ってください。アプリ内に API のクレジットと、API 由来の写真の提供元を表示しています。

## GitHub Pages のデプロイ

`main` ブランチの `meshi-gacha/` に変更を push すると、[GitHub Actions](.github/workflows/deploy-meshi-gacha.yml) が Pages に自動デプロイします。GitHub リポジトリの **Settings > Pages** で公開元を **GitHub Actions** に設定してください。

## リポジトリ構成

```text
.
├── .github/workflows/
│   └── deploy-meshi-gacha.yml  # GitHub Pages へのデプロイ
├── meshi-gacha/
│   ├── index.html              # アプリ画面
│   ├── styles.css              # スタイル
│   ├── app.js                  # 画面操作・検索・抽選
│   ├── server.ps1              # ローカル API サーバー
│   └── README.md               # アプリの起動・利用方法
├── 基本設計書.md
└── インフラ基本設計.md
```

設計資料: [基本設計書](基本設計書.md) / [インフラ基本設計書](インフラ基本設計.md)
