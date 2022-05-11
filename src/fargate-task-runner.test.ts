import { mockClient } from 'aws-sdk-client-mock'
import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs'
import { FargateTaskRunner } from './fargate-task-runner'

describe('run', () => {
  const mock = mockClient(ECSClient)
  const client = new ECSClient({})
  const sut = new FargateTaskRunner(client, '')

  beforeEach(() => mock.reset())

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
      assertErrorMatches(e, /Expected response to contain 1 task, found 0/)
    }

    try {
      await sut.run(inputs)
    } catch (e) {
      assertErrorMatches(e, /Expected response to contain 1 task, found 2/)
    }
  })
})

function assertErrorMatches(e: unknown, r: RegExp) {
  if (!(e instanceof Error)) {
    fail(`Unexpected error type: ${typeof e}`)
  }

  expect(e.message).toMatch(r)
}
