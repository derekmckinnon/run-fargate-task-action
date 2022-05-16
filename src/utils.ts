import * as core from '@actions/core'

export function getInput(name: string, required = false): string {
  return core.getInput(name, { required })
}

export function getBooleanInput(name: string): boolean {
  return core.getBooleanInput(name)
}

export function getListInput(name: string, required = false): string[] {
  const list = getInput(name, required)

  return parseList(list)
}

export function getObjectInput<T>(
  name: string,
  required = false
): T | undefined {
  const json = getInput(name, required)

  return parseJSON<T>(json)
}

export function parseList(list: string): string[] {
  if (!list) {
    return []
  }

  return list.split(',')
}

export function parseJSON<T>(json: string): T | undefined {
  if (!json) {
    return undefined
  }

  return JSON.parse(json) as T
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message
  }

  return String(e)
}
