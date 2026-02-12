import * as cdk from "aws-cdk-lib";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

export interface CodeDeployStackProps extends cdk.StackProps {
  ecsService: ecs.FargateService;
  prodListener: elbv2.ApplicationListener;
  testListener: elbv2.ApplicationListener;
  blueTargetGroup: elbv2.ApplicationTargetGroup;
  greenTargetGroup: elbv2.ApplicationTargetGroup;
}

export class CodeDeployStack extends cdk.Stack {
  public readonly deploymentGroup: codedeploy.EcsDeploymentGroup;

  constructor(scope: Construct, id: string, props: CodeDeployStackProps) {
    super(scope, id, props);

    const application = new codedeploy.EcsApplication(this, "Application", {
      applicationName: "ssr-app",
    });

    this.deploymentGroup = new codedeploy.EcsDeploymentGroup(
      this,
      "DeploymentGroup",
      {
        application,
        deploymentGroupName: "ssr-deployment-group",
        service: props.ecsService,
        blueGreenDeploymentConfig: {
          blueTargetGroup: props.blueTargetGroup,
          greenTargetGroup: props.greenTargetGroup,
          listener: props.prodListener,
          testListener: props.testListener,
          terminationWaitTime: cdk.Duration.minutes(5),
        },
        deploymentConfig:
          codedeploy.EcsDeploymentConfig.CANARY_10PERCENT_5MINUTES,
        autoRollback: {
          failedDeployment: true,
          stoppedDeployment: true,
        },
      }
    );
  }
}
