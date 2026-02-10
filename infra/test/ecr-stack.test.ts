import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { EcrStack } from "../lib/stacks/ecr-stack";

describe("EcrStack", () => {
  const app = new cdk.App();
  const stack = new EcrStack(app, "TestEcrStack");
  const template = Template.fromStack(stack);

  it("creates an ECR repository", () => {
    template.resourceCountIs("AWS::ECR::Repository", 1);
  });

  it("sets repository name to ssr-app", () => {
    template.hasResourceProperties("AWS::ECR::Repository", {
      RepositoryName: "ssr-app",
    });
  });

  it("has lifecycle rule with max 10 images", () => {
    template.hasResourceProperties("AWS::ECR::Repository", {
      LifecyclePolicy: {
        LifecyclePolicyText: JSON.stringify({
          rules: [
            {
              rulePriority: 1,
              description: "Keep only 10 images",
              selection: {
                tagStatus: "any",
                countType: "imageCountMoreThan",
                countNumber: 10,
              },
              action: { type: "expire" },
            },
          ],
        }),
      },
    });
  });
});
