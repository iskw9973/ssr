import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

export interface PipelineStackProps extends cdk.StackProps {
  repository: ecr.Repository;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact("SourceOutput");
    const buildOutput = new codepipeline.Artifact("BuildOutput");

    const sourceAction =
      new codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "GitHub",
        owner: "iskw9973",
        repo: "ssr",
        branch: "main",
        output: sourceOutput,
        connectionArn: cdk.Fn.importValue("GitHubConnectionArn"),
      });

    const buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: "ssr-build",
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      environmentVariables: {
        ECR_REPO_URI: {
          value: props.repository.repositoryUri,
        },
        AWS_DEFAULT_REGION: {
          value: this.region,
        },
        AWS_ACCOUNT_ID: {
          value: this.account,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            commands: [
              "echo Logging in to Amazon ECR...",
              "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com",
              'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              "echo Building the Docker image...",
              "docker build -f docker/Dockerfile -t $ECR_REPO_URI:latest -t $ECR_REPO_URI:$IMAGE_TAG .",
            ],
          },
          post_build: {
            commands: [
              "echo Pushing the Docker image...",
              "docker push $ECR_REPO_URI:latest",
              "docker push $ECR_REPO_URI:$IMAGE_TAG",
              'printf \'[{"name":"app","imageUri":"%s"}]\' $ECR_REPO_URI:$IMAGE_TAG > imagedefinitions.json',
              "cat imagedefinitions.json",
            ],
          },
        },
        artifacts: {
          files: [
            "imagedefinitions.json",
            "appspec.yaml",
            "taskdef.json",
          ],
        },
      }),
    });

    props.repository.grantPullPush(buildProject);

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "Build",
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "ssr-pipeline",
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
      ],
    });
  }
}
