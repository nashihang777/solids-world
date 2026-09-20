import { describe, expect, it } from 'vitest'
import { buildAtlasFor } from './atlas'
import { SEARCH_RESULT_LIMIT, searchEntries } from './search'
import type { AtlasEntry } from './types'

const ATLAS = buildAtlasFor('zh')

function fakeEntry(id: string, name: string, overrides: Partial<AtlasEntry> = {}): AtlasEntry {
  return {
    id,
    field: 'crystal',
    category: 'classic',
    name,
    aliases: [],
    english: name.toUpperCase(),
    accent: '#888888',
    summary: '',
    facts: [],
    elements: [],
    hotspots: [],
    trivia: '',
    guide: { lesson: [], quiz: [] },
    source: '',
    ...overrides,
  }
}

describe('搜索五级命中排序（interaction-design.md 八）', () => {
  it('① 条目名精确命中排最前', () => {
    expect(searchEntries('岩盐结构', ATLAS).map((e) => e.id)).toEqual(['nacl'])
    expect(searchEntries('金刚石结构', ATLAS).map((e) => e.id)).toEqual(['diamond'])
  })

  it('② 条目名包含命中', () => {
    const ids = searchEntries('金刚石', ATLAS).map((e) => e.id)
    expect(ids).toContain('diamond')
    expect(ids[0]).toBe('diamond')
  })

  it('③ 别名/俗名命中（含 aliases.ts 扩展）', () => {
    expect(searchEntries('食盐', ATLAS).map((e) => e.id)).toContain('nacl')
    expect(searchEntries('钻石', ATLAS).map((e) => e.id)).toContain('diamond')
  })

  it('④ 拼音命中（全拼与首字母）', () => {
    expect(searchEntries('jingangshijiegou', ATLAS).map((e) => e.id)).toContain('diamond')
    expect(searchEntries('yyjg', ATLAS).map((e) => e.id)).toContain('nacl')
    expect(searchEntries('lhsjg', ATLAS).map((e) => e.id)).toContain('cscl')
  })

  it('⑤ 学名/正文命中（≥2 字符才启用）', () => {
    const ids = searchEntries('八面体', ATLAS).map((e) => e.id)
    expect(ids).toContain('nacl')
    const one = [fakeEntry('a1', '甲甲', { summary: '稀有词组' }), fakeEntry('a2', '乙乙')]
    expect(searchEntries('稀', one).map((e) => e.id)).toEqual([])
    expect(searchEntries('稀有', one).map((e) => e.id)).toEqual(['a1'])
  })

  it('精确命中排在包含命中之前', () => {
    const set = [
      fakeEntry('contains', '石墨结构'),
      fakeEntry('exact', '石墨'),
    ]
    expect(searchEntries('石墨', set).map((e) => e.id)).toEqual(['exact', 'contains'])
  })

  it('结果超过 12 条时截断', () => {
    const many = Array.from({ length: 20 }, (_, i) => fakeEntry(`e${i}`, `晶体${i}号`))
    const results = searchEntries('晶体', many)
    expect(results.length).toBe(SEARCH_RESULT_LIMIT)
  })

  it('空查询与无命中返回空', () => {
    expect(searchEntries('', ATLAS)).toEqual([])
    expect(searchEntries('不存在的词组', ATLAS)).toEqual([])
  })
})
