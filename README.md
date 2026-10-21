# めしガチャ

ジャンル・予算・検索範囲などを選び、3本のスロットリールでお店を抽選する Web アプリです。現在の画面はVue 3と架空のサンプル店舗データで動くフロントエンド試作です。

## 公開ページ

画面は [GitHub Pages](https://25yc0102-png.github.io/sotsugyo-project/) で公開しています。現状はVueをCDNから読み込む静的な画面試作で、抽選には架空のサンプルデータを使用します。実在店舗の検索はフロントエンドにまだ接続されていません。

## ローカルで使う

Node.js は不要です。リポジトリを取得後、`meshi-gacha/index.html` をブラウザーで開いてください。Vue本体の読み込みにはインターネット接続が必要です。ローカルHTTPサーバーを使う場合は、リポジトリ直下で次を実行し、`http://localhost:8000/meshi-gacha/` を開きます。

```powershell
py -m http.server 8000
```

画面ではジャンル・予算・好み・範囲を選んで抽選できます。店舗名や住所はすべて画面確認用の架空データです。

## API キーとプライバシー

現在のフロントエンド試作は店舗検索API、位置情報、外部検索サービスに接続せず、APIキーや個人情報も扱いません。旧ローカルAPIサーバー `meshi-gacha/server.ps1` は残っていますが、この試作画面からは利用しません。将来APIを接続する場合、APIキーはフロントエンドに置かずバックエンドで管理してください。

## 使用技術とデータ表記

- HTML、CSS、JavaScript
- 旧ローカル API サーバー: PowerShell スクリプト（現在の画面からは未接続）
- 店舗情報: [ホットペッパーグルメ Webサービス](https://webservice.recruit.co.jp/)
- 地名検索: [Photon](https://photon.komoot.io/) / [OpenStreetMap](https://www.openstreetmap.org/copyright)

実データ/APIを接続する際は、ホットペッパーグルメ Webサービスの利用規約と[公式ガイドライン](https://webservice.recruit.co.jp/doc/hotpepper/guideline.html)に従い、必要なクレジットを表示してください。

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
├── インフラ基本設計.md
└── デザインガイドライン.md
```

設計資料: [基本設計書](基本設計書.md) / [インフラ基本設計書](インフラ基本設計.md) / [デザインガイドライン](デザインガイドライン.md)
