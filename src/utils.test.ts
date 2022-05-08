import { parseList } from './utils'

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
