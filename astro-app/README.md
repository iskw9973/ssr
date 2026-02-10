# astro-app

Astro 5 SSR アプリケーション。`@astro-aws/adapter` で AWS Lambda 向けにビルドする。

## 前提条件

- Node.js 20+
- pnpm

## セットアップ

```bash
# ルートディレクトリで依存関係をインストール
pnpm install

# 環境変数ファイルを作成
cp .env.example .env
```

## 開発

```bash
pnpm --filter astro-app dev
```

http://localhost:4321 で確認できる。

## ビルド

```bash
pnpm --filter astro-app build
```

ビルド出力は `dist/` に生成される。

| ディレクトリ | 内容 | デプロイ先 |
|---|---|---|
| `dist/lambda/` | Lambda ハンドラー (`entry.mjs`) | Lambda Function |
| `dist/client/` | 静的アセット (`_astro/`, `favicon.svg` 等) | S3 Bucket |
| `dist/server/` | SSR サーバーコード (Lambda が内部で参照) | - |

## テスト

```bash
pnpm --filter astro-app test
```

## ディレクトリ構成

```
astro-app/
├── src/
│   ├── layouts/Layout.astro    # 共通レイアウト
│   └── pages/
│       ├── index.astro         # ホーム (SSR)
│       ├── about.astro         # About ページ
│       └── api/health.ts       # ヘルスチェック API
├── public/                     # 静的ファイル
├── astro.config.mjs            # Astro 設定
└── package.json
```
