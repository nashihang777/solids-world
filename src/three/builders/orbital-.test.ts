import { describe, expect, it } from 'vitest'
import { buildOrbitalModel, mostProbableR, psi, radialWave, sampleField, surfaceNets } from './orbital-'
import type { BuildOptions } from '../kit'

const OPTIONS: BuildOptions = {
  supercell: 1,
  theme: 'dark',
  bondTolerance: 1.15,
  palette: { muted: '#93a8b0', ink: '#e9f1f2' },
}

function countKind(model: { group: { traverse: (cb: (obj: unknown) => void) => void } }, kind: string): number {
  let count = 0
  model.group.traverse((obj) => {
    const userData = (obj as { userData?: Record<string, unknown> }).userData
    if (userData?.kind === kind) count++
  })
  return count
}

describe('氢波函数采样（需求05 二.1：形状由真实数学计算得出）', () => {
  it('2s 径向波节位于 r=2a₀ 且两侧反号', () => {
    expect(Math.abs(radialWave(2, 0, 2))).toBeLessThan(1e-9)
    expect(radialWave(2, 0, 0.5)).toBeGreaterThan(0)
    expect(radialWave(2, 0, 3)).toBeLessThan(0)
  })

  it('2pz 波函数在 z=0 波节面上为零且随 z 反号', () => {
    expect(Math.abs(psi('pz', 2, 1, 1, 1, 0))).toBeLessThan(1e-9)
    expect(psi('pz', 2, 1, 0, 0, 2)).toBeGreaterThan(0)
    expect(psi('pz', 2, 1, 0, 0, -2)).toBeLessThan(0)
  })

  it('dxy 波函数在 x=0 与 y=0 两个波节面上为零', () => {
    expect(Math.abs(psi('dxy', 3, 2, 0, 2, 1))).toBeLessThan(1e-9)
    expect(Math.abs(psi('dxy', 3, 2, 2, 0, 1))).toBeLessThan(1e-9)
  })

  it('径向概率峰：1s 在 a₀、2p 在 4a₀', () => {
    expect(Math.abs(mostProbableR(1, 0) - 1)).toBeLessThan(0.06)
    expect(Math.abs(mostProbableR(2, 1) - 4)).toBeLessThan(0.06)
  })
})

describe('等值面几何断言（需求05 五：瓣数、波节数、取向与教材对照）', () => {
  it('2p 正相位等值面整体位于波节面之上、负相位位于之下', () => {
    const sample = sampleField('pz', 2, 1)
    const span = (sample.extent * 2) / (sample.dims - 1)
    const center = (sample.dims - 1) / 2
    for (const sign of [1, -1] as const) {
      const field = sign === 1 ? sample.field : sample.field.map((v) => -v)
      const mesh = surfaceNets(field, sample.dims, sample.maxAbs * 0.2)
      expect(mesh.positions.length).toBeGreaterThan(0)
      let wrong = 0
      for (let p = 2; p < mesh.positions.length; p += 3) {
        if (sign * (mesh.positions[p] - center) * span < 0) wrong++
      }
      expect(wrong, `sign=${sign} 越过节面的顶点数`).toBe(0)
    }
  })

  it('2p 模型含恰好 1 个波节面薄片（pz 取向：z=0 平面）', () => {
    const model = buildOrbitalModel({ n: 2, l: 1, mode: 'pz', pMode: 'single' }, OPTIONS)
    expect(countKind(model, 'nodal-surface')).toBe(1)
    expect(model.anchors.lobeTop.z).toBeGreaterThan(0)
    expect(model.anchors.lobeBottom.z).toBeLessThan(0)
  })

  it('dxy 模型含 2 个波节面薄片（x=0 与 y=0 平面）', () => {
    const model = buildOrbitalModel({ n: 3, l: 2, mode: 'dxy', pMode: 'single' }, OPTIONS)
    expect(countKind(model, 'nodal-surface')).toBe(2)
  })

  it('dz² 双哑铃 + 环带：环带锚点在赤道面且轴向瓣更长（需求05 五：易画错形态）', () => {
    const model = buildOrbitalModel({ n: 3, l: 2, mode: 'dz2', pMode: 'single' }, OPTIONS)
    expect(countKind(model, 'nodal-surface')).toBe(2)
    const ring = model.anchors.ringBand
    const lobe = model.anchors.lobeTop
    expect(ring).toBeTruthy()
    expect(ring.y).toBe(0)
    expect(ring.z).toBe(0)
    expect(ring.x).toBeGreaterThan(0)
    expect(lobe.z).toBeGreaterThan(ring.x)
  })

  it('1s 等值面半径符合 2e^(−r) = 阈值×峰值 的解析解', () => {
    const model = buildOrbitalModel({ n: 1, l: 0, mode: 's', pMode: 'single' }, OPTIONS)
    expect(Math.abs(model.anchors.bohrRadius.x - Math.log(1 / 0.2))).toBeLessThan(0.05)
    expect(model.anchors.outerEdge.x).toBeGreaterThan(0)
  })

  it('p 同看模式输出三组正交瓣锚点（需求05 三：单看/同看）', () => {
    const model = buildOrbitalModel({ n: 2, l: 1, mode: 'pz', pMode: 'triple' }, OPTIONS)
    expect(model.anchors.lobeTop).toBeTruthy()
    expect(model.anchors.lobeX).toBeTruthy()
    expect(model.anchors.lobeY).toBeTruthy()
  })

  it('2s 双层结构：正相位内球 + 负相位外壳同时可见（分相位阈值）', () => {
    const model = buildOrbitalModel({ n: 2, l: 0, mode: 's', pMode: 'single' }, OPTIONS)
    let pos = 0
    let neg = 0
    model.group.traverse((obj) => {
      const userData = (obj as { userData?: Record<string, unknown> }).userData
      if (userData?.kind !== 'orbital-surface') return
      if (userData.phase === 1) pos++
      else neg++
    })
    expect(pos).toBe(1)
    expect(neg).toBe(1)
  })

  it('1s 无负相位：仅正相位等值面', () => {
    const model = buildOrbitalModel({ n: 1, l: 0, mode: 's', pMode: 'single' }, OPTIONS)
    let pos = 0
    let neg = 0
    model.group.traverse((obj) => {
      const userData = (obj as { userData?: Record<string, unknown> }).userData
      if (userData?.kind !== 'orbital-surface') return
      if (userData.phase === 1) pos++
      else neg++
    })
    expect(pos).toBe(1)
    expect(neg).toBe(0)
  })
})
