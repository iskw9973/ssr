import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { VpcStack } from "../lib/stacks/vpc-stack";
import { EcrStack } from "../lib/stacks/ecr-stack";
import { EcsStack } from "../lib/stacks/ecs-stack";
import { CodeDeployStack } from "../lib/stacks/codedeploy-stack";

describe("CodeDeployStack", () => {
  const app = new cdk.App();
  const vpcStack = new VpcStack(app, "TestVpcStack");
  const ecrStack = new EcrStack(app, "TestEcrStack");
  const ecsStack = new EcsStack(app, "TestEcsStack", {
    vpc: vpcStack.vpc,
    repository: ecrStack.repository,
  });
  const codeDeployStack = new CodeDeployStack(app, "TestCodeDeployStack", {
    ecsService: ecsStack.service,
    prodListener: ecsStack.prodListener,
    testListener: ecsStack.testListener,
    blueTargetGroup: ecsStack.blueTargetGroup,
    greenTargetGroup: ecsStack.greenTargetGroup,
  });
  const template = Template.fromStack(codeDeployStack);

  it("creates a CodeDeploy application", () => {
    template.hasResourceProperties("AWS::CodeDeploy::Application", {
      ApplicationName: "ssr-app",
      ComputePlatform: "ECS",
    });
  });

  it("creates a deployment group with canary config", () => {
    template.hasResourceProperties("AWS::CodeDeploy::DeploymentGroup", {
      DeploymentGroupName: "ssr-deployment-group",
      DeploymentConfigName: "CodeDeployDefault.ECSCanary10Percent5Minutes",
    });
  });

  it("has auto rollback enabled", () => {
    template.hasResourceProperties("AWS::CodeDeploy::DeploymentGroup", {
      AutoRollbackConfiguration: {
        Enabled: true,
      },
    });
  });
});
