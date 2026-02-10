import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LambdaStack } from "../lib/stacks/lambda-stack";
import * as path from "path";

describe("LambdaStack", () => {
  const app = new cdk.App();
  const stack = new LambdaStack(app, "TestLambdaStack", {
    serverAssetPath: path.join(__dirname, "fixtures/server"),
  });
  const template = Template.fromStack(stack);

  it("creates a Lambda function with Node.js 20 runtime", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs20.x",
    });
  });

  it("sets memory size to 512MB", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      MemorySize: 512,
    });
  });

  it("sets timeout to 30 seconds", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Timeout: 30,
    });
  });

  it("creates a Function URL with AuthType AWS_IAM", () => {
    template.hasResourceProperties("AWS::Lambda::Url", {
      AuthType: "AWS_IAM",
    });
  });

  it("creates exactly one Lambda function", () => {
    template.resourceCountIs("AWS::Lambda::Function", 1);
  });
});
