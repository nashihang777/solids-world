import { describe, expect, it } from 'vitest'
import { groupClosure, type SymGen } from './symmetry-elements-'

describe('点群闭包阶数（需求06 五：对称元素数量与教材一致）', () => {
  it('2/m (C2h) = 4 阶', () => {
    const gens: SymGen[] = [
      { type: 'rot', axis: [0, 1, 0], angle: Math.PI },
      { type: 'inversion' },
    ]
    expect(groupClosure(gens).length).toBe(4)
  })

  it('4/mmm (D4h) = 16 阶', () => {
    const gens: SymGen[] = [
      { type: 'rot', axis: [0, 0, 1], angle: Math.PI / 2 },
      { type: 'rot', axis: [1, 0, 0], angle: Math.PI },
      { type: 'mirror', normal: [0, 0, 1] },
    ]
    expect(groupClosure(gens).length).toBe(16)
  })

  it('6/mmm (D6h) = 24 阶', () => {
    const gens: SymGen[] = [
      { type: 'rot', axis: [0, 0, 1], angle: Math.PI / 3 },
      { type: 'rot', axis: [1, 0, 0], angle: Math.PI },
      { type: 'mirror', normal: [0, 0, 1] },
    ]
    expect(groupClosure(gens).length).toBe(24)
  })

  it('432 (O) = 24 阶', () => {
    const gens: SymGen[] = [
      { type: 'rot', axis: [0, 0, 1], angle: Math.PI / 2 },
      { type: 'rot', axis: [1, 1, 1], angle: (Math.PI * 2) / 3 },
    ]
    expect(groupClosure(gens).length).toBe(24)
  })

  it('-43m (Td) = 24 阶（含镜面，无反演）', () => {
    const gens: SymGen[] = [
      { type: 'rotinv', axis: [0, 0, 1], angle: Math.PI / 2 },
      { type: 'rot', axis: [1, 1, 1], angle: (Math.PI * 2) / 3 },
    ]
    const ops = groupClosure(gens)
    expect(ops.length).toBe(24)
    const hasInversion = ops.some((m) => {
      const e = m.elements
      return (
        Math.abs(e[0] + 1) < 1e-6 && Math.abs(e[4] + 1) < 1e-6 && Math.abs(e[8] + 1) < 1e-6
      )
    })
    expect(hasInversion).toBe(false)
  })

  it('m-3m (Oh) = 48 阶', () => {
    const gens: SymGen[] = [
      { type: 'rot', axis: [0, 0, 1], angle: Math.PI / 2 },
      { type: 'rot', axis: [1, 1, 1], angle: (Math.PI * 2) / 3 },
      { type: 'inversion' },
    ]
    expect(groupClosure(gens).length).toBe(48)
  })
})
