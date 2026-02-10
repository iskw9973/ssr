#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/stacks/vpc-stack";
import { EcrStack } from "../lib/stacks/ecr-stack";
import { EcsStack } from "../lib/stacks/ecs-stack";
import { CodeDeployStack } from "../lib/stacks/codedeploy-stack";
import { PipelineStack } from "../lib/stacks/pipeline-stack";
import { CdnWafStack } from "../lib/stacks/cdn-waf-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const tokyoEnv: cdk.Environment = { account, region: "ap-northeast-1" };
const usEast1Env: cdk.Environment = { account, region: "us-east-1" };

const vpcStack = new VpcStack(app, "SsrVpcStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
});
const ecrStack = new EcrStack(app, "SsrEcrStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
});

const ecsStack = new EcsStack(app, "SsrEcsStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
  vpc: vpcStack.vpc,
  repository: ecrStack.repository,
});

new CodeDeployStack(app, "SsrCodeDeployStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
  ecsService: ecsStack.service,
  prodListener: ecsStack.prodListener,
  testListener: ecsStack.testListener,
  blueTargetGroup: ecsStack.blueTargetGroup,
  greenTargetGroup: ecsStack.greenTargetGroup,
});

new PipelineStack(app, "SsrPipelineStack", {
  env: tokyoEnv,
  crossRegionReferences: true,
  repository: ecrStack.repository,
});

new CdnWafStack(app, "SsrCdnWafStack", {
  env: usEast1Env,
  crossRegionReferences: true,
  albDnsName: ecsStack.alb.loadBalancerDnsName,
});

app.synth();
