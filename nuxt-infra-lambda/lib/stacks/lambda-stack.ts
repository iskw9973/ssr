import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface LambdaStackProps extends cdk.StackProps {
  serverAssetPath: string;
}

export class LambdaStack extends cdk.Stack {
  public readonly fn: lambda.Function;
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    this.fn = new lambda.Function(this, "SsrFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(props.serverAssetPath),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
    });

    this.functionUrl = this.fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    // Allow CloudFront OAC to invoke the Lambda Function URL.
    // Uses sourceAccount (not sourceArn) to avoid circular dependency with the Distribution.
    new lambda.CfnPermission(this, "CloudFrontOacPermission", {
      action: "lambda:InvokeFunctionUrl",
      functionName: this.fn.functionName,
      principal: "cloudfront.amazonaws.com",
      sourceAccount: this.account,
    });
  }
}
