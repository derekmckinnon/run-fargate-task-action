# run-fargate-task-action

This action runs a Fargate Task in AWS ECS.

It assumes that you have already authenticated with AWS in a previous step.
See [Complete Example](#complete-example) below.

# Usage

```yaml
- uses: derekmckinnon/run-fargate-task-action@v2
  with:
    task-definition: task.json
    cluster: foo-cluster
    subnets: subnet-0fdf9a0b76b5c2139
    assign-public-ip: false
    security-groups: sg-0dc69ab6439733bf9
    wait-for-task: true
    fail-on-task-error: true
```

# Inputs

| Name               | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| task-definition    | The family and revision or full ARN of the task definition to run    |
| cluster            | The short name or full ARN of the cluster to run your task on        |
| subnets            | The IDs of the subnets associated with the task                      |
| assign-public-ip   | Controls whether the task's ENI receives a public IP address         |
| security-groups    | The IDs of the security groups associated with the task              |
| wait-for-task      | Controls whether or not to wait until the task completes             |
| fail-on-task-error | Controls whether or not to fail the step if a task error is returned |

# Complete Example

```yaml
name: Deploy

on:
  push:
    branches:
      - main

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/setup-qemu-action@v3

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: us-east-1
          role-to-assume: arn:aws:iam::123456789100:role/my-github-actions-role

      - uses: aws-actions/amazon-ecr-login@v1
        id: ecr

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ steps.ecr.outputs.registry }}/foobar
          tags: |
            type=sha,format=long,prefix=
          labels: |
            org.opencontainers.image.title=Foobar
            org.opencontainers.image.vendor=Foo Inc.

      - uses: docker/build-push-action@v5
        with:
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          push: true

      - uses: aws-actions/amazon-ecs-render-task-definition@v1
        id: render-task-definition
        with:
          task-definition: task-definition.json
          container-name: foobar
          image: ${{ steps.meta.outputs.tags }}

      - run: |
          arn=$(aws ecs register-task-definition \
            --cli-input-json file://${{ steps.render-task-definition.outputs.task-definition }} \
            | jq --raw-output '.taskDefinition.taskDefinitionArn')

          echo "::set-output name=arn::$arn"
        id: register-task-definition

      - uses: derekmckinnon/run-fargate-task-action@v2
        with:
          task-definition: ${{ steps.register-task-definition.outputs.arn }}
          cluster: foo-cluster
          subnets: subnet-0fdf9a0b76b5c2139
          assign-public-ip: false
          security-groups: sg-0dc69ab6439733bf9
          wait-for-task: true
          fail-on-task-error: true
```
