import { mockClient } from 'aws-sdk-client-mock'
import {
  DescribeTasksCommand,
  ECSClient,
  RunTaskCommand,
} from '@aws-sdk/client-ecs'
import { FargateTaskRunner } from './fargate-task-runner'

function assertErrorMatches(e: unknown, expected: string | RegExp) {
  if (!(e instanceof Error)) {
    fail(`Unexpected error type: ${typeof e}`)
  }

  expect(e.message).toMatch(expected)
}

const mock = mockClient(ECSClient)
const client = new ECSClient({})
const sut = new FargateTaskRunner(client, '')

beforeEach(() => mock.reset())

describe('run', () => {
  it('returns task on success', async () => {
    mock.on(RunTaskCommand).resolves({
      tasks: [
        {
          taskArn: 'foobar',
        },
      ],
      failures: [],
    })

    const task = await sut.run({
      subnets: [],
      securityGroups: [],
      assignPublicIp: false,
    })

    expect(task.taskArn).toBe('foobar')
  })

  it('throws error when api returns failures', async () => {
    mock.on(RunTaskCommand).resolves({
      tasks: [],
      failures: [{}],
    })

    try {
      await sut.run({
        subnets: [],
        securityGroups: [],
        assignPublicIp: false,
      })
    } catch (e) {
      assertErrorMatches(
        e,
        /Expected response to contain 0 failures, found 1: */
      )
    }
  })

  it('throws error when api returns unexpected number of tasks', async () => {
    mock
      .on(RunTaskCommand)
      .resolvesOnce({
        tasks: [],
        failures: [],
      })
      .resolvesOnce({
        tasks: [{}, {}],
        failures: [],
      })

    const inputs = {
      subnets: [],
      securityGroups: [],
      assignPublicIp: false,
    }

    try {
      await sut.run(inputs)
    } catch (e) {
      assertErrorMatches(e, 'Expected response to contain 1 task, found 0')
    }

    try {
      await sut.run(inputs)
    } catch (e) {
      assertErrorMatches(e, 'Expected response to contain 1 task, found 2')
    }
  })
})

describe('waitForExit', () => {
  it('throws on invalid taskArn', async () => {
    try {
      await sut.waitForExit({ clusterArn: 'bar' })
    } catch (e) {
      assertErrorMatches(e, 'Invalid Task: Missing taskArn')
    }
  })

  it('throws on invalid taskArn', async () => {
    try {
      await sut.waitForExit({ taskArn: 'foobar' })
    } catch (e) {
      assertErrorMatches(e, 'Invalid Task: Missing clusterArn')
    }
  })

  it('throws when api returns failures', async () => {
    mock
      .on(DescribeTasksCommand)
      .resolvesOnce({
        tasks: [
          {
            lastStatus: 'STOPPED',
          },
        ],
        failures: [],
      })
      .resolvesOnce({
        tasks: [],
      })

    try {
      await sut.waitForExit({
        taskArn: 'foobar',
        clusterArn: 'bar',
      })
    } catch (e) {
      assertErrorMatches(e, 'Expected response to contain 1 task, found 0')
    }
  })

  it('throws on container errors', async () => {
    mock
      .on(DescribeTasksCommand)
      .resolvesOnce({
        tasks: [
          {
            lastStatus: 'STOPPED',
          },
        ],
        failures: [],
      })
      .resolvesOnce({
        tasks: [
          {
            containers: [
              {
                exitCode: 1,
                name: 'foobar',
                reason: 'test',
              },
            ],
          },
        ],
      })

    try {
      await sut.waitForExit({
        taskArn: 'foobar',
        clusterArn: 'bar',
      })
    } catch (e) {
      assertErrorMatches(e, /1 container(s)*/)
    }
  })
})
