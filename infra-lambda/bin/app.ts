#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { LambdaStack } from "../lib/stacks/lambda-stack";
import { StaticAssetsStack } from "../lib/stacks/static-assets-stack";
import { CdnWafStack } from "../lib/stacks/cdn-waf-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;

// Lambda + S3 → ap-northeast-1 (Tokyo)
const tokyoEnv: cdk.Environment = { account, region: "ap-northeast-1" };

// WAF (CLOUDFRONT scope) → us-east-1 required by AWS
const usEast1Env: cdk.Environment = { account, region: "us-east-1" };

const appOutputDir = path.join(__dirname, "../../app/.output");

const lambdaStack = new LambdaStack(app, "SsrLambdaStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
  serverAssetPath: path.join(appOutputDir, "server"),
});

const staticAssetsStack = new StaticAssetsStack(app, "SsrStaticAssetsStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
  publicAssetPath: path.join(appOutputDir, "public"),
});

new CdnWafStack(app, "SsrCdnWafStack", {
  env: usEast1Env,
  crossRegionReferences: true,
  functionUrl: lambdaStack.functionUrl,
  assetsBucket: staticAssetsStack.bucket,
});

app.synth();
