import { describe, expect, it } from 'vitest'
import { buildAtlasFor } from './atlas'
import { ENTRIES_EN } from './entries.en'
import { ENTRIES_ZH } from './entries.zh'
import { ENTRIES_BRAVAIS_ZH } from './entries-bravais.zh'
import { ENTRIES_BRAVAIS_EN } from './entries-bravais.en'
import { ENTRIES_CRYSTAL2_ZH } from './entries-crystal2.zh'
import { ENTRIES_CRYSTAL2_EN } from './entries-crystal2.en'
import { ENTRIES_ATOMIC_ZH } from './entries-atomic.zh'
import { ENTRIES_ATOMIC_EN } from './entries-atomic.en'
import { ENTRIES_SYMMETRY_ZH } from './entries-symmetry.zh'
import { ENTRIES_SYMMETRY_EN } from './entries-symmetry.en'
import { ENTRIES_DYNAMICS_ZH } from './entries-dynamics.zh'
import { ENTRIES_DYNAMICS_EN } from './entries-dynamics.en'
import { GUIDES_EN } from './guides.en'
import { GUIDES_ZH } from './guides.zh'
import { GUIDES_BRAVAIS_ZH } from './guides-bravais.zh'
import { GUIDES_BRAVAIS_EN } from './guides-bravais.en'
import { GUIDES_CRYSTAL2_ZH } from './guides-crystal2.zh'
import { GUIDES_CRYSTAL2_EN } from './guides-crystal2.en'
import { GUIDES_ATOMIC_ZH } from './guides-atomic.zh'
import { GUIDES_ATOMIC_EN } from './guides-atomic.en'
import { GUIDES_SYMMETRY_ZH } from './guides-symmetry.zh'
import { GUIDES_SYMMETRY_EN } from './guides-symmetry.en'
import { GUIDES_DYNAMICS_ZH } from './guides-dynamics.zh'
import { GUIDES_DYNAMICS_EN } from './guides-dynamics.en'

const ATLAS = buildAtlasFor('zh')
const ATLAS_EN = buildAtlasFor('en')

const ALL_ZH = [
  ...ENTRIES_ZH,
  ...ENTRIES_BRAVAIS_ZH,
  ...ENTRIES_CRYSTAL2_ZH,
  ...ENTRIES_ATOMIC_ZH,
  ...ENTRIES_SYMMETRY_ZH,
  ...ENTRIES_DYNAMICS_ZH,
]
const ALL_EN = [
  ...ENTRIES_EN,
  ...ENTRIES_BRAVAIS_EN,
  ...ENTRIES_CRYSTAL2_EN,
  ...ENTRIES_ATOMIC_EN,
  ...ENTRIES_SYMMETRY_EN,
  ...ENTRIES_DYNAMICS_EN,
]
const ALL_GUIDES_ZH: Record<string, typeof GUIDES_ZH[keyof typeof GUIDES_ZH]> = {
  ...GUIDES_ZH,
  ...GUIDES_BRAVAIS_ZH,
  ...GUIDES_CRYSTAL2_ZH,
  ...GUIDES_ATOMIC_ZH,
  ...GUIDES_SYMMETRY_ZH,
  ...GUIDES_DYNAMICS_ZH,
}
const ALL_GUIDES_EN: Record<string, typeof GUIDES_EN[keyof typeof GUIDES_EN]> = {
  ...GUIDES_EN,
  ...GUIDES_BRAVAIS_EN,
  ...GUIDES_CRYSTAL2_EN,
  ...GUIDES_ATOMIC_EN,
  ...GUIDES_SYMMETRY_EN,
  ...GUIDES_DYNAMICS_EN,
}

describe('数据齐备（testing.md 3.2 数据齐备守卫）', () => {
  it('每条目 facts 6~8 条、hotspots 3~6 个', () => {
    for (const entry of ATLAS) {
      expect(entry.facts.length, `${entry.id} facts`).toBeGreaterThanOrEqual(6)
      expect(entry.facts.length, `${entry.id} facts`).toBeLessThanOrEqual(8)
      expect(entry.hotspots.length, `${entry.id} hotspots`).toBeGreaterThanOrEqual(3)
      expect(entry.hotspots.length, `${entry.id} hotspots`).toBeLessThanOrEqual(6)
    }
  })

  it('每条目必有讲解与测验，且讲解至少 3 步、测验至少 2 题', () => {
    for (const entry of ATLAS) {
      expect(entry.guide.lesson.length, `${entry.id} lesson`).toBeGreaterThanOrEqual(3)
      expect(entry.guide.quiz.length, `${entry.id} quiz`).toBeGreaterThanOrEqual(2)
      for (const step of entry.guide.lesson) {
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.body.length).toBeGreaterThan(0)
      }
      for (const question of entry.guide.quiz) {
        expect(question.options.length).toBe(3)
        expect(question.answer).toBeLessThan(3)
        expect(question.explain.length).toBeGreaterThan(0)
      }
    }
  })

  it('每条目文本字段非空且声明元素统计', () => {
    for (const entry of ATLAS) {
      for (const key of ['name', 'english', 'summary', 'trivia', 'source'] as const) {
        expect(entry[key].length, `${entry.id}.${key}`).toBeGreaterThan(0)
      }
      expect(entry.visualNotice?.length ?? 0, `${entry.id}.visualNotice`).toBeGreaterThan(0)
      if (entry.field === 'crystal' && entry.category !== 'bravais') {
        expect(entry.elements.length, `${entry.id} elements`).toBeGreaterThan(0)
      }
      expect(entry.accent).toMatch(/^#[0-9a-f]{6}$/i)
      for (const fact of entry.facts) {
        expect(fact.key.length).toBeGreaterThan(0)
        expect(fact.value.length).toBeGreaterThan(0)
      }
    }
  })

  it('facts 键与 hotspots id 在条目内唯一', () => {
    for (const entry of ATLAS) {
      const factKeys = new Set(entry.facts.map((fact) => fact.key))
      expect(factKeys.size, `${entry.id} facts 去重后数量`).toBe(entry.facts.length)
      const hotspotIds = new Set(entry.hotspots.map((hotspot) => hotspot.id))
      expect(hotspotIds.size, `${entry.id} hotspots 去重后数量`).toBe(entry.hotspots.length)
    }
  })
})

describe('双语 parity（testing.md 3.2 双语守卫）', () => {
  it('zh/en 条目 id 集合一致', () => {
    const zhIds = ALL_ZH.map((entry) => entry.id).sort()
    const enIds = ALL_EN.map((entry) => entry.id).sort()
    expect(enIds).toEqual(zhIds)
  })

  it('zh/en 逐条目 id/category/field/elements/accent 严格一致', () => {
    for (const zh of ALL_ZH) {
      const en = ALL_EN.find((entry) => entry.id === zh.id)
      expect(en, `en 缺少 ${zh.id}`).toBeDefined()
      expect(en?.category).toBe(zh.category)
      expect(en?.field).toBe(zh.field)
      expect(en?.elements).toEqual(zh.elements)
      expect(en?.accent).toBe(zh.accent)
      expect(en?.facts.map((fact) => fact.key)).toEqual(zh.facts.map((fact) => fact.key))
      expect(en?.facts.map((fact) => fact.icon)).toEqual(zh.facts.map((fact) => fact.icon))
    }
  })

  it('zh/en hotspots 的 id/anchor/tone 严格一致', () => {
    for (const zh of ALL_ZH) {
      const en = ALL_EN.find((entry) => entry.id === zh.id)
      expect(en?.hotspots.length, `${zh.id} hotspots 数`).toBe(zh.hotspots.length)
      zh.hotspots.forEach((hotspot, index) => {
        expect(en?.hotspots[index].id).toBe(hotspot.id)
        expect(en?.hotspots[index].anchor).toBe(hotspot.anchor)
        expect(en?.hotspots[index].tone).toBe(hotspot.tone)
      })
    }
  })

  it('zh/en 讲解步数一致、测验答案一致', () => {
    for (const zh of Object.keys(ALL_GUIDES_ZH)) {
      const en = ALL_GUIDES_EN[zh]
      expect(en, `en guide 缺少 ${zh}`).toBeDefined()
      expect(en?.lesson.length).toBe(ALL_GUIDES_ZH[zh].lesson.length)
      expect(en?.quiz.map((question) => question.answer)).toEqual(ALL_GUIDES_ZH[zh].quiz.map((question) => question.answer))
      const zhAnchors = ALL_GUIDES_ZH[zh].lesson.map((step) => step.anchor ?? '')
      const enAnchors = en?.lesson.map((step) => step.anchor ?? '') ?? []
      expect(enAnchors).toEqual(zhAnchors)
    }
  })

  it('zh/en 图鉴规模一致（53 条：晶体 26 + 原子 11 + 对称 11 + 动态 5）', () => {
    expect(ATLAS.length).toBe(53)
    expect(ATLAS_EN.length).toBe(53)
  })
})
