# astro-infra-lambda

Astro SSR を AWS Lambda + CloudFront + WAF でデプロイする CDK インフラ。

## アーキテクチャ

```
Internet
  | HTTPS
CloudFront (us-east-1)
  |-- デフォルト: Lambda Function URL (ap-northeast-1) ... SSR
  |-- /_astro/*: S3 (ap-northeast-1) .................... 静的アセット
  |
WAF WebACL
  |-- Rate Limit: 2000 req/IP
  |-- AWS Managed Rules (Common Rule Set)
```

### スタック構成

| スタック | リージョン | リソース |
|---|---|---|
| AstroLambdaStack | ap-northeast-1 | Lambda Function + Function URL (IAM 認証) |
| AstroStaticAssetsStack | ap-northeast-1 | S3 Bucket + BucketDeployment |
| AstroCdnWafStack | us-east-1 | CloudFront + WAF + OAC |

## 前提条件

- Node.js 20+
- pnpm
- AWS CLI (認証情報を設定済み)
- AWS CDK CLI (`pnpm cdk` で利用可能)

## セットアップ

```bash
# ルートディレクトリで依存関係をインストール
pnpm install

# 環境変数ファイルを作成
cp .env.example .env
# CDK_DEFAULT_ACCOUNT を自分の AWS アカウント ID に書き換える
```

## ビルド〜デプロイ手順

### 1. Astro アプリをビルド

```bash
pnpm --filter astro-app build
```

`astro-app/dist/` に Lambda ハンドラーと静的アセットが生成される。

### 2. CDK の TypeScript をビルド

```bash
pnpm --filter astro-infra-lambda build
```

### 3. テスト

```bash
pnpm --filter astro-infra-lambda test
```

### 4. CDK Bootstrap (初回のみ)

2 リージョンの bootstrap が必要。

```bash
# 東京リージョン (Lambda + S3)
pnpm --filter astro-infra-lambda cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1

# バージニアリージョン (CloudFront + WAF)
pnpm --filter astro-infra-lambda cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
```

### 5. diff で変更を確認

```bash
pnpm --filter astro-infra-lambda cdk diff --all
```

### 6. デプロイ

```bash
pnpm --filter astro-infra-lambda cdk deploy --all --require-approval broadening
```

もしくはデプロイスクリプトでまとめて実行：

```bash
./astro-infra-lambda/deploy.sh
```

### 7. 動作確認

デプロイ完了後、CloudFront の Distribution ドメインが出力される。

```bash
curl https://<distribution-domain>/api/health
# => {"status":"ok"}
```

## 削除

```bash
pnpm --filter astro-infra-lambda cdk destroy --all
```

## ディレクトリ構成

```
astro-infra-lambda/
├── bin/app.ts                      # CDK エントリポイント
├── lib/stacks/
│   ├── lambda-stack.ts             # Lambda + Function URL
│   ├── static-assets-stack.ts      # S3 + OAC
│   └── cdn-waf-stack.ts           # CloudFront + WAF
├── test/                           # CDK テスト
│   ├── lambda-stack.test.ts
│   ├── static-assets-stack.test.ts
│   └── cdn-waf-stack.test.ts
├── deploy.sh                       # ワンコマンドデプロイ
├── cdk.json
└── .env.example
```
