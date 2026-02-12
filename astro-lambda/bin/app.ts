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

const astroOutputDir = path.join(__dirname, "../../astro-app/dist");

const lambdaStack = new LambdaStack(app, "AstroLambdaStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
  serverAssetPath: path.join(astroOutputDir, "lambda"),
});

const staticAssetsStack = new StaticAssetsStack(
  app,
  "AstroStaticAssetsStack",
  {
    env: tokyoEnv,
    crossRegionReferences: true,
    publicAssetPath: path.join(astroOutputDir, "client"),
  },
);

new CdnWafStack(app, "AstroCdnWafStack", {
  env: usEast1Env,
  crossRegionReferences: true,
  functionUrl: lambdaStack.functionUrl,
  assetsBucket: staticAssetsStack.bucket,
});

app.synth();
