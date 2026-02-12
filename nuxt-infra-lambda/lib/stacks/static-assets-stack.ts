import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface StaticAssetsStackProps extends cdk.StackProps {
  publicAssetPath: string;
}

export class StaticAssetsStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StaticAssetsStackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "StaticAssetsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Explicit bucket policy for CloudFront OAC access.
    // Cross-region S3BucketOrigin.withOriginAccessControl auto-policy is a no-op.
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudFrontOac",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("*")],
        conditions: {
          StringEquals: { "AWS:SourceAccount": this.account },
        },
      }),
    );

    new s3deploy.BucketDeployment(this, "DeployStaticAssets", {
      sources: [s3deploy.Source.asset(props.publicAssetPath)],
      destinationBucket: this.bucket,
    });
  }
}
