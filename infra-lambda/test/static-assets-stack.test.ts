import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { StaticAssetsStack } from "../lib/stacks/static-assets-stack";
import * as path from "path";

describe("StaticAssetsStack", () => {
  const app = new cdk.App();
  const stack = new StaticAssetsStack(app, "TestStaticAssetsStack", {
    publicAssetPath: path.join(__dirname, "fixtures/public"),
  });
  const template = Template.fromStack(stack);

  it("creates an S3 bucket with BlockPublicAccess BLOCK_ALL", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it("creates exactly one S3 bucket", () => {
    template.resourceCountIs("AWS::S3::Bucket", 1);
  });

  it("sets DESTROY removal policy on the bucket", () => {
    template.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Delete",
    });
  });

  it("creates a BucketDeployment (Custom::CDKBucketDeployment)", () => {
    template.resourceCountIs("Custom::CDKBucketDeployment", 1);
  });
});
