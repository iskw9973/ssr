import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

export interface CdnWafStackProps extends cdk.StackProps {
  functionUrl: lambda.FunctionUrl;
  assetsBucket: s3.IBucket;
}

export class CdnWafStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CdnWafStackProps) {
    super(scope, id, props);

    // WAF WebACL
    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
      defaultAction: { allow: {} },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "AstroLambdaWafMetrics",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "RateLimitRule",
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: "IP",
            },
          },
          action: { block: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "RateLimitRule",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // Extract domain from Function URL (e.g. "https://xxx.lambda-url.ap-northeast-1.on.aws/")
    const functionUrlDomain = cdk.Fn.select(
      2,
      cdk.Fn.split("/", props.functionUrl.url),
    );

    // Use HttpOrigin instead of FunctionUrlOrigin.withOriginAccessControl
    // to work around CDK issue #34536 (cross-region Lambda Permission created in wrong region)
    const lambdaOrigin = new origins.HttpOrigin(functionUrlDomain);

    // Manual OAC for Lambda origin
    const lambdaOac = new cloudfront.CfnOriginAccessControl(
      this,
      "LambdaOac",
      {
        originAccessControlConfig: {
          name: `${this.stackName}-lambda-oac`,
          originAccessControlOriginType: "lambda",
          signingBehavior: "always",
          signingProtocol: "sigv4",
        },
      },
    );

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: lambdaOrigin,
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      additionalBehaviors: {
        "/_astro/*": {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(
              props.assetsBucket,
            ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      webAclId: webAcl.attrArn,
    });

    // Escape hatch: attach OAC to the Lambda origin (Origins.0 = defaultBehavior origin)
    const cfnDist = this.distribution.node
      .defaultChild as cloudfront.CfnDistribution;
    cfnDist.addPropertyOverride(
      "DistributionConfig.Origins.0.OriginAccessControlId",
      lambdaOac.attrId,
    );
  }
}
