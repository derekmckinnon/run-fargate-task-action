/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  AssignPublicIp,
  DescribeTasksCommand,
  ECSClient,
  Failure,
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

export interface TaskExitData {
  succeeded: boolean
  errors: string[]
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

    if (response.failures?.length) {
      throw new Error(`Error: ${toErrorMessage(response.failures[0])}`)
    }

    return response.tasks![0]
  }

  public async wait(task: Task): Promise<void> {
    await waitUntilTasksStopped(
      {
        client: this.client,
        maxWaitTime: 1800, // 60 minutes
      },
      {
        tasks: [task.taskArn!],
        cluster: task.clusterArn,
      }
    )
  }

  public async getTaskExitData(task: Task): Promise<TaskExitData> {
    const command = new DescribeTasksCommand({
      tasks: [task.taskArn!],
      cluster: task.clusterArn,
    })

    const response = await this.client.send(command)

    if (response.failures?.length) {
      return {
        succeeded: false,
        errors: response.failures.map(toErrorMessage),
      }
    }

    const containers = response.tasks![0]!.containers!
    const errors = containers.filter(c => c.exitCode !== 0).map(c => c.reason!)

    return {
      succeeded: errors.length === 0,
      errors,
    }
  }
}

function toErrorMessage({ arn, reason, detail }: Failure) {
  return `${arn} ${reason} - ${detail}`
}
