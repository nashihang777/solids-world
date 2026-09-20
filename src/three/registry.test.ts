import { beforeAll, describe, expect, it, vi } from 'vitest'
import { buildAtlasFor } from '../data/atlas'
import { cacheSize, listBuilderIds, loadEntry } from './registry'

const ATLAS = buildAtlasFor('zh')

beforeAll(() => {
  window.solids = { log: vi.fn() } as unknown as Window['solids']
})

const OPTIONS = {
  supercell: 1 as const,
  theme: 'dark' as const,
  bondTolerance: 1.15,
  palette: { muted: '#93a8b0', ink: '#e9f1f2' },
}

describe('三层齐备（testing.md 3.2：数据条目 ↔ builder 文件 ↔ 图鉴卡片）', () => {
  it('builder 目录无幽灵、无缺失：listBuilderIds 与 ATLAS 条目一一对应', () => {
    const builderIds = [...listBuilderIds()].sort()
    const atlasIds = ATLAS.map((entry) => entry.id).sort()
    expect(builderIds).toEqual(atlasIds)
  })
})

describe('anchor 接缝（testing.md 3.2：hotspot/lesson anchor 必须存在于 builder 产物）', () => {
  it('每个条目的 hotspot 与讲解步 anchor 均能命中模型 anchors', async () => {
    for (const entry of ATLAS) {
      const model = await loadEntry(entry.id, OPTIONS)
      const anchorKeys = Object.keys(model.anchors)
      for (const hotspot of entry.hotspots) {
        expect(anchorKeys, `${entry.id} 缺少 hotspot anchor：${hotspot.anchor}`).toContain(hotspot.anchor)
      }
      for (const step of entry.guide.lesson) {
        if (!step.anchor) continue
        expect(anchorKeys, `${entry.id} 缺少 lesson anchor：${step.anchor}`).toContain(step.anchor)
      }
    }
  })
})

describe('LRU 缓存（performance.md 2.3：≤12 模型、逐出必 dispose）', () => {
  it('加载超过 12 个变体后缓存收敛到 12', async () => {
    const ids = ATLAS.map((entry) => entry.id)
    let loaded = 0
    for (const supercell of [1, 2] as const) {
      for (const theme of ['dark', 'light'] as const) {
        for (const id of ids) {
          await loadEntry(id, { ...OPTIONS, supercell, theme })
          loaded += 1
        }
      }
    }
    expect(loaded).toBe(ids.length * 4)
    await loadEntry(ids[0], { ...OPTIONS, bondTolerance: 1.2 })
    expect(loaded + 1).toBeGreaterThanOrEqual(13)
    expect(cacheSize()).toBeLessThanOrEqual(12)
  })
})
