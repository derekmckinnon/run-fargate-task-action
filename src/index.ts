import * as core from '@actions/core'
import * as utils from './utils'
import { ECSClient, TaskOverride } from '@aws-sdk/client-ecs'
import { FargateTaskRunner } from './fargate-task-runner'

async function run() {
  try {
    const taskDefinition = utils.getInput('task-definition', true)
    const cluster = utils.getInput('cluster')
    const overrides = utils.getObjectInput<TaskOverride>('overrides')
    const subnets = utils.getListInput('subnets', true)
    const securityGroups = utils.getListInput('securityGroups', true)
    const assignPublicIp = utils.getBooleanInput('assign-public-ip')
    const waitForTask = utils.getBooleanInput('wait-for-task')

    const client = new ECSClient({
      customUserAgent: 'run-fargate-task-action',
    })

    const runner = new FargateTaskRunner(client, taskDefinition)

    const task = await runner.run({
      subnets,
      securityGroups,
      assignPublicIp,
      cluster,
      overrides,
    })

    core.setOutput('task-arn', task.taskArn)

    if (!waitForTask) {
      return
    }

    await runner.wait(task)

    const exitData = await runner.getTaskExitData(task)

    core.setOutput('task-succeeded', exitData.succeeded)
    core.setOutput('task-errors', exitData.errors)
  } catch (error) {
    core.setFailed(error as Error)
  }
}

run()
