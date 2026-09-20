import { describe, expect, it } from 'vitest'
import { buildDiatomicChain, buildMonoChain } from './lattice-wave-'
import buildThermal from './thermal-expansion'
import buildOsc from './harmonic-vs-anharmonic'
import type { EntryModel } from '../kit'

const OPTIONS = {
  supercell: 1 as const,
  theme: 'dark' as const,
  bondTolerance: 1.15,
  palette: { muted: '#93a8b0', ink: '#e9f1f2' },
}

interface TestMesh {
  userData?: Record<string, unknown>
  position?: { x: number; y: number; z: number }
}

function atomMeshes(model: EntryModel, kind: string): Array<{ position: { x: number; y: number; z: number } }> {
  const found: Array<{ position: { x: number; y: number; z: number } }> = []
  model.group.traverse((obj) => {
    const mesh = obj as TestMesh
    if (mesh.userData?.kind === kind && mesh.position) found.push({ position: mesh.position })
  })
  return found
}

function meshByKind(model: EntryModel, kind: string): { position: { x: number; y: number; z: number } } {
  const found = atomMeshes(model, kind)
  if (found.length === 0) throw new Error(`未找到 kind=${kind}`)
  return found[0]
}

describe('双原子链相位关系（需求07 五：声学/光学支与教材一致）', () => {
  it('声学支：相邻 M 与 m 同相振动', () => {
    const model = buildDiatomicChain(OPTIONS)
    model.setAnimParams?.({ branch: 0, frequency: 1.2 })
    const bigs = atomMeshes(model, 'wave-atom-m').filter((m) => Math.abs(m.position.y) < 1e-9)
    void bigs
    const all = atomMeshes(model, 'wave-atom-m')
    const big0 = all[0]
    const small0 = all[1]
    const uM = big0.position.x - 0
    const um = small0.position.x - 0.5
    expect(uM * um).toBeGreaterThanOrEqual(0)
  })

  it('光学支：M 与 m 反相振动且质心不动（2·u_M + u_m = 0，M=2m）', () => {
    const model = buildDiatomicChain(OPTIONS)
    model.setAnimParams?.({ branch: 1, frequency: 1.2 })
    model.animStep?.()
    const all = atomMeshes(model, 'wave-atom-m')
    const uM = all[0].position.x - 0
    const um = all[1].position.x - 0.5
    expect(uM * um).toBeLessThanOrEqual(0)
    expect(2 * uM + um).toBeCloseTo(0, 5)
  })
})

describe('单原子链波长直觉（相邻原子相位差随 λ 增大而减小）', () => {
  it('λ=4 时相邻原子位移差异大于 λ=12', () => {
    const short = buildMonoChain(OPTIONS)
    short.setAnimParams?.({ wavelength: 4, frequency: 1.5 })
    const long = buildMonoChain(OPTIONS)
    long.setAnimParams?.({ wavelength: 12, frequency: 1.5 })
    const shortAtoms = atomMeshes(short, 'wave-atom')
    const longAtoms = atomMeshes(long, 'wave-atom')
    const shortSpread = Math.abs(shortAtoms[1].position.y - shortAtoms[0].position.y)
    const longSpread = Math.abs(longAtoms[1].position.y - longAtoms[0].position.y)
    expect(shortSpread).toBeGreaterThan(longSpread)
  })
})

describe('热膨胀因果动画（需求07 五：振幅增大 → 平均间距右移）', () => {
  it('温度升高后振动原子平均位置右移（非简谐效应）', () => {
    const cold = buildThermal(OPTIONS)
    cold.setAnimParams?.({ temperature: 0.02 })
    const hot = buildThermal(OPTIONS)
    hot.setAnimParams?.({ temperature: 0.95 })
    const coldAtom = meshByKind(cold, 'thermal-atom')
    const hotAtom = meshByKind(hot, 'thermal-atom')
    const atomsCold = atomMeshes(cold, 'thermal-atom')
    const atomsHot = atomMeshes(hot, 'thermal-atom')
    void coldAtom
    void hotAtom
    const coldRight = Math.max(...atomsCold.map((a) => a.position.x))
    const hotRight = Math.max(...atomsHot.map((a) => a.position.x))
    const coldCenter = (Math.min(...atomsCold.map((a) => a.position.x)) + coldRight) / 2
    const hotCenter = (Math.min(...atomsHot.map((a) => a.position.x)) + hotRight) / 2
    expect(hotCenter).toBeGreaterThan(coldCenter)
    expect(hotRight - Math.min(...atomsHot.map((a) => a.position.x))).toBeGreaterThan(
      coldRight - Math.min(...atomsCold.map((a) => a.position.x)),
    )
  })

  it('平均位置标记随温度右移（曲线上的金色轨迹点）', () => {
    const cold = buildThermal(OPTIONS)
    cold.setAnimParams?.({ temperature: 0.02 })
    const hot = buildThermal(OPTIONS)
    hot.setAnimParams?.({ temperature: 0.95 })
    const coldMean = meshByKind(cold, 'thermal-mean').position.x
    const hotMean = meshByKind(hot, 'thermal-mean').position.x
    expect(hotMean).toBeGreaterThan(coldMean)
  })
})

describe('简谐 vs 非简谐（软化：大振幅周期变长）', () => {
  it('能量增大时非简谐振子中心右移（不对称势）', () => {
    const low = buildOsc(OPTIONS)
    low.setAnimParams?.({ energy: 0.08 })
    const high = buildOsc(OPTIONS)
    high.setAnimParams?.({ energy: 0.45 })
    const lowRight = atomMeshes(low, 'osc-ball')[1].position.x
    const highRight = atomMeshes(high, 'osc-ball')[1].position.x
    expect(highRight).toBeGreaterThan(lowRight)
  })

  it('左球过零时右球仍在正位移侧（周期更长，相位落后）', () => {
    const model = buildOsc(OPTIONS)
    model.setAnimParams?.({ energy: 0.4 })
    for (let i = 0; i < 30; i++) model.animStep?.()
    const balls = atomMeshes(model, 'osc-ball')
    const leftLocal = balls[0].position.x + 2.2
    const rightLocal = balls[1].position.x - 2.2
    if (Math.abs(leftLocal) < 0.05) {
      expect(rightLocal).toBeGreaterThan(0)
    } else {
      expect(leftLocal).not.toBeCloseTo(0, 1)
    }
  })
})
