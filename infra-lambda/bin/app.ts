#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { LambdaStack } from "../lib/stacks/lambda-stack";
import { StaticAssetsStack } from "../lib/stacks/static-assets-stack";
import { CdnWafStack } from "../lib/stacks/cdn-waf-stack";

const app = new cdk.App();

// WAF is CLOUDFRONT scope → must deploy to us-east-1
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

const appOutputDir = path.join(__dirname, "../../app/.output");

const lambdaStack = new LambdaStack(app, "SsrLambdaStack", {
  env,
  serverAssetPath: path.join(appOutputDir, "server"),
});

const staticAssetsStack = new StaticAssetsStack(app, "SsrStaticAssetsStack", {
  env,
  publicAssetPath: path.join(appOutputDir, "public"),
});

new CdnWafStack(app, "SsrCdnWafStack", {
  env,
  functionUrl: lambdaStack.functionUrl,
  assetsBucket: staticAssetsStack.bucket,
});

app.synth();
