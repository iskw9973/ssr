import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { VpcStack } from "../lib/stacks/vpc-stack";

describe("VpcStack", () => {
  const app = new cdk.App();
  const stack = new VpcStack(app, "TestVpcStack");
  const template = Template.fromStack(stack);

  it("creates a VPC", () => {
    template.resourceCountIs("AWS::EC2::VPC", 1);
  });

  it("creates 2 public and 2 private subnets", () => {
    template.resourceCountIs("AWS::EC2::Subnet", 4);
  });

  it("creates 1 NAT Gateway", () => {
    template.resourceCountIs("AWS::EC2::NatGateway", 1);
  });
});
