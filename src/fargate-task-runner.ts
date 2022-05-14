import {
  AssignPublicIp,
  DescribeTasksCommand,
  ECSClient,
  LaunchType,
  RunTaskCommand,
  Task,
  TaskOverride,
  waitUntilTasksStopped,
} from '@aws-sdk/client-ecs'

export interface RunOptions {
  subnets: string[]
  securityGroups: string[]
  assignPublicIp: boolean
  cluster?: string
  overrides?: TaskOverride
}

export class FargateTaskRunner {
  constructor(private client: ECSClient, private taskDefinition: string) {}

  public async run(options: RunOptions): Promise<Task> {
    const command = new RunTaskCommand({
      taskDefinition: this.taskDefinition,
      cluster: options.cluster,
      overrides: options.overrides,
      launchType: LaunchType.FARGATE,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: options.subnets,
          securityGroups: options.securityGroups,
          assignPublicIp: options.assignPublicIp
            ? AssignPublicIp.ENABLED
            : AssignPublicIp.DISABLED,
        },
      },
    })

    const response = await this.client.send(command)

    const failures = response.failures || []
    if (failures.length) {
      throw new Error(
        `Expected response to contain 0 failures, found ${
          failures.length
        }: ${JSON.stringify(failures)}`
      )
    }

    const tasks = response.tasks || []
    if (tasks.length !== 1) {
      throw new Error(
        `Expected response to contain 1 task, found ${tasks.length}`
      )
    }

    return tasks[0]
  }

  public async waitForExit(task: Task): Promise<void> {
    if (!task.taskArn) {
      throw new Error('Invalid Task: Missing taskArn')
    }

    if (!task.clusterArn) {
      throw new Error('Invalid Task: Missing clusterArn')
    }

    await waitUntilTasksStopped(
      {
        client: this.client,
        maxWaitTime: 1800, // 60 minutes
      },
      {
        tasks: [task.taskArn],
        cluster: task.clusterArn,
      }
    )

    const command = new DescribeTasksCommand({
      tasks: [task.taskArn],
      cluster: task.clusterArn,
    })

    const response = await this.client.send(command)

    const failures = response.failures || []
    if (failures.length) {
      throw new Error(`Error describing ECS Tasks: ${JSON.stringify(failures)}`)
    }

    const tasks = response.tasks || []
    if (!tasks.length) {
      throw new Error(`Expected response to contain 1 task, found 0`)
    }

    const containers = tasks[0].containers || []

    const errors = containers
      .filter(c => c.exitCode !== 0)
      .map(c => `${c.name} (${c.exitCode}): ${c.reason}`)

    if (errors.length) {
      throw new Error(
        `${errors.length} container(s) exited with errors: ${JSON.stringify(
          errors
        )}`
      )
    }
  }
}
