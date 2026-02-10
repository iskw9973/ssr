import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
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

  it("allows ingress from CloudFront managed prefix list on port 80", () => {
    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      IpProtocol: "tcp",
      FromPort: 80,
      ToPort: 80,
      SourcePrefixListId: "pl-58a04531",
    });
  });

  it("allows ingress from CloudFront managed prefix list on port 8080", () => {
    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      IpProtocol: "tcp",
      FromPort: 8080,
      ToPort: 8080,
      SourcePrefixListId: "pl-58a04531",
    });
  });

  it("does not allow ingress from 0.0.0.0/0", () => {
    const sgs = template.findResources("AWS::EC2::SecurityGroup");
    for (const [, sg] of Object.entries(sgs)) {
      const ingress = sg.Properties?.SecurityGroupIngress ?? [];
      for (const rule of ingress) {
        expect(rule.CidrIp).not.toBe("0.0.0.0/0");
      }
    }
    const sgIngress = template.findResources("AWS::EC2::SecurityGroupIngress");
    for (const [, rule] of Object.entries(sgIngress)) {
      expect(rule.Properties?.CidrIp).not.toBe("0.0.0.0/0");
    }
  });
});
