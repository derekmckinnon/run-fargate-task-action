import { parseJSON, parseList } from './utils'

describe('parseList', () => {
  it('returns correct list of strings', () => {
    const stringList = 'foo,bar,baz'

    const list = parseList(stringList)

    expect(list).toHaveLength(3)
    expect(list).toEqual(['foo', 'bar', 'baz'])
  })

  it('parses single item', () => {
    const stringList = 'foo'

    const list = parseList(stringList)

    expect(list).toHaveLength(1)
    expect(list).toEqual(['foo'])
  })

  it('returns empty list for empty string', () => {
    expect(parseList('')).toHaveLength(0)
  })
})

interface Foobar {
  name: string
  baz: boolean
}

describe('parseJSON', () => {
  it('hydrates object correctly', () => {
    const json = `{"name":"Test","baz":false}`

    const foobar = parseJSON<Foobar>(json)

    if (!foobar) {
      throw Error(`foobar was ${typeof foobar}`)
    }

    expect(foobar.name).toBe('Test')
    expect(foobar.baz).toBe(false)
  })

  it('returns undefined for empty string', () => {
    const foobar = parseJSON<Foobar>('')

    expect(foobar).toBeUndefined()
  })
})
