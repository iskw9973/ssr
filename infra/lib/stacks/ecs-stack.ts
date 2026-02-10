import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  repository: ecr.Repository;
}

export class EcsStack extends cdk.Stack {
  public readonly service: ecs.FargateService;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly prodListener: elbv2.ApplicationListener;
  public readonly testListener: elbv2.ApplicationListener;
  public readonly blueTargetGroup: elbv2.ApplicationTargetGroup;
  public readonly greenTargetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
      clusterName: "ssr-cluster",
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        cpu: 256,
        memoryLimitMiB: 512,
        family: "ssr-app",
      }
    );

    taskDefinition.addContainer("app", {
      image: ecs.ContainerImage.fromEcrRepository(props.repository, "latest"),
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "ssr-app",
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "3000",
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })\"",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    this.alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: props.vpc,
      internetFacing: true,
      loadBalancerName: "ssr-alb",
    });

    const alb = this.alb;

    this.blueTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "BlueTargetGroup",
      {
        vpc: props.vpc,
        port: 3000,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: "/api/health",
          interval: cdk.Duration.seconds(30),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      }
    );

    this.greenTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "GreenTargetGroup",
      {
        vpc: props.vpc,
        port: 3000,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: "/api/health",
          interval: cdk.Duration.seconds(30),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      }
    );

    this.prodListener = alb.addListener("ProdListener", {
      port: 80,
      open: false,
      defaultTargetGroups: [this.blueTargetGroup],
    });

    this.testListener = alb.addListener("TestListener", {
      port: 8080,
      open: false,
      defaultTargetGroups: [this.greenTargetGroup],
    });

    // Allow inbound only from CloudFront managed prefix list (origin bypass prevention)
    const cfPrefixListId = ec2.Peer.prefixList("pl-58a04531"); // ap-northeast-1
    alb.connections.securityGroups[0].addIngressRule(
      cfPrefixListId,
      ec2.Port.tcp(80),
      "Allow CloudFront origin-facing",
    );
    alb.connections.securityGroups[0].addIngressRule(
      cfPrefixListId,
      ec2.Port.tcp(8080),
      "Allow CloudFront origin-facing (test)",
    );

    this.service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: 2,
      deploymentController: {
        type: ecs.DeploymentControllerType.CODE_DEPLOY,
      },
      serviceName: "ssr-service",
    });

    this.service.attachToApplicationTargetGroup(this.blueTargetGroup);

    new cdk.CfnOutput(this, "AlbDnsName", {
      value: alb.loadBalancerDnsName,
      description: "ALB DNS Name",
    });
  }
}
