import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Template, Match } from "aws-cdk-lib/assertions";
import { CdnWafStack } from "../lib/stacks/cdn-waf-stack";

describe("CdnWafStack", () => {
  const app = new cdk.App();

  const tokyoEnv: cdk.Environment = {
    account: "123456789012",
    region: "ap-northeast-1",
  };
  const usEast1Env: cdk.Environment = {
    account: "123456789012",
    region: "us-east-1",
  };

  // Create Lambda in a separate stack with Tokyo region
  const lambdaStack = new cdk.Stack(app, "TestLambdaStack", {
    env: tokyoEnv,
    crossRegionReferences: true,
  });
  const fn = new lambda.Function(lambdaStack, "Fn", {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    code: lambda.Code.fromInline("exports.handler = () => {}"),
  });
  const functionUrl = fn.addFunctionUrl({
    authType: lambda.FunctionUrlAuthType.AWS_IAM,
  });

  // Import bucket by name to avoid cyclic cross-stack references
  const bucket = s3.Bucket.fromBucketName(
    lambdaStack,
    "ImportedBucket",
    "test-bucket",
  );

  const stack = new CdnWafStack(app, "TestCdnWafStack", {
    env: usEast1Env,
    crossRegionReferences: true,
    functionUrl,
    assetsBucket: bucket,
  });
  const template = Template.fromStack(stack);

  it("creates exactly one CloudFront distribution", () => {
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);
  });

  it("creates a WAF WebACL with CLOUDFRONT scope", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Scope: "CLOUDFRONT",
    });
  });

  it("configures a Rate Limit rule", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: "RateLimitRule",
          Statement: {
            RateBasedStatement: {
              Limit: 2000,
              AggregateKeyType: "IP",
            },
          },
          Action: { Block: {} },
        }),
      ]),
    });
  });

  it("configures AWS Managed Common Rules", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: "AWSManagedRulesCommonRuleSet",
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: "AWS",
              Name: "AWSManagedRulesCommonRuleSet",
            },
          },
          OverrideAction: { None: {} },
        }),
      ]),
    });
  });

  it("associates the WAF WebACL with the CloudFront distribution", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        WebACLId: Match.anyValue(),
      }),
    });
  });

  it("creates an OAC for Lambda origin", () => {
    template.hasResourceProperties("AWS::CloudFront::OriginAccessControl", {
      OriginAccessControlConfig: Match.objectLike({
        OriginAccessControlOriginType: "lambda",
        SigningBehavior: "always",
        SigningProtocol: "sigv4",
      }),
    });
  });

  it("sets ALL_VIEWER_EXCEPT_HOST_HEADER origin request policy on default behavior", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          OriginRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
        }),
      }),
    });
  });
});
