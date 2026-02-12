import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { CdnWafStack } from "../lib/stacks/cdn-waf-stack";

describe("CdnWafStack", () => {
  const app = new cdk.App();
  const stack = new CdnWafStack(app, "TestCdnWafStack", {
    env: { account: "123456789012", region: "us-east-1" },
    albDnsName: "ssr-alb-123456789.ap-northeast-1.elb.amazonaws.com",
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

  it("uses HTTP_ONLY origin protocol for ALB", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Origins: Match.arrayWith([
          Match.objectLike({
            CustomOriginConfig: Match.objectLike({
              OriginProtocolPolicy: "http-only",
            }),
          }),
        ]),
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

  it("disables caching for SSR content", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        }),
      }),
    });
  });

  it("redirects HTTP to HTTPS for viewers", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: "redirect-to-https",
        }),
      }),
    });
  });
});
