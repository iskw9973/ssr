#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/stacks/vpc-stack";
import { EcrStack } from "../lib/stacks/ecr-stack";
import { EcsStack } from "../lib/stacks/ecs-stack";
import { CodeDeployStack } from "../lib/stacks/codedeploy-stack";
import { PipelineStack } from "../lib/stacks/pipeline-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
};

const vpcStack = new VpcStack(app, "SsrVpcStack", { env });
const ecrStack = new EcrStack(app, "SsrEcrStack", { env });

const ecsStack = new EcsStack(app, "SsrEcsStack", {
  env,
  vpc: vpcStack.vpc,
  repository: ecrStack.repository,
});

new CodeDeployStack(app, "SsrCodeDeployStack", {
  env,
  ecsService: ecsStack.service,
  prodListener: ecsStack.prodListener,
  testListener: ecsStack.testListener,
  blueTargetGroup: ecsStack.blueTargetGroup,
  greenTargetGroup: ecsStack.greenTargetGroup,
});

new PipelineStack(app, "SsrPipelineStack", {
  env,
  repository: ecrStack.repository,
});

app.synth();
