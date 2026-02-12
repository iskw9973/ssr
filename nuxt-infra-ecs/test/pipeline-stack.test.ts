import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { EcrStack } from "../lib/stacks/ecr-stack";
import { PipelineStack } from "../lib/stacks/pipeline-stack";

describe("PipelineStack", () => {
  const app = new cdk.App();
  const ecrStack = new EcrStack(app, "TestEcrStack");
  const pipelineStack = new PipelineStack(app, "TestPipelineStack", {
    repository: ecrStack.repository,
  });
  const template = Template.fromStack(pipelineStack);

  it("creates a CodePipeline", () => {
    template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Name: "ssr-pipeline",
    });
  });

  it("has Source and Build stages", () => {
    template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Stages: [
        { Name: "Source" },
        { Name: "Build" },
      ],
    });
  });

  it("creates a CodeBuild project", () => {
    template.hasResourceProperties("AWS::CodeBuild::Project", {
      Name: "ssr-build",
    });
  });
});
