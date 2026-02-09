import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { VpcStack } from "../lib/stacks/vpc-stack";
import { EcrStack } from "../lib/stacks/ecr-stack";
import { EcsStack } from "../lib/stacks/ecs-stack";

describe("EcsStack", () => {
  const app = new cdk.App();
  const vpcStack = new VpcStack(app, "TestVpcStack");
  const ecrStack = new EcrStack(app, "TestEcrStack");
  const ecsStack = new EcsStack(app, "TestEcsStack", {
    vpc: vpcStack.vpc,
    repository: ecrStack.repository,
  });
  const template = Template.fromStack(ecsStack);

  it("creates an ECS cluster", () => {
    template.hasResourceProperties("AWS::ECS::Cluster", {
      ClusterName: "ssr-cluster",
    });
  });

  it("creates a Fargate task definition with 256 CPU and 512 MiB memory", () => {
    template.hasResourceProperties("AWS::ECS::TaskDefinition", {
      Cpu: "256",
      Memory: "512",
      Family: "ssr-app",
    });
  });

  it("creates a Fargate service with CODE_DEPLOY deployment controller", () => {
    template.hasResourceProperties("AWS::ECS::Service", {
      DeploymentController: { Type: "CODE_DEPLOY" },
      DesiredCount: 2,
      ServiceName: "ssr-service",
    });
  });

  it("creates an ALB", () => {
    template.hasResourceProperties(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      {
        Name: "ssr-alb",
        Scheme: "internet-facing",
      }
    );
  });

  it("creates prod listener on port 80 and test listener on port 8080", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
    });
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 8080,
    });
  });

  it("creates two target groups", () => {
    template.resourceCountIs(
      "AWS::ElasticLoadBalancingV2::TargetGroup",
      2
    );
  });
});
