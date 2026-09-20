import { describe, expect, it } from 'vitest'
import { buildCrystalStructure, hexagonalCell, type CrystalParams } from './crystal-structure-'
import buildM3m from './pointgroup-m3m'
import buildTd from './pointgroup-43m'

const OPTIONS = {
  supercell: 1 as const,
  theme: 'dark' as const,
  bondTolerance: 1.15,
  palette: { muted: '#93a8b0', ink: '#e9f1f2' },
}

const GRAPHITE: CrystalParams = {
  cell: hexagonalCell(2.464, 6.71),
  atoms: [
    { element: 'C', fract: [0, 0, 0.25] },
    { element: 'C', fract: [1 / 3, 2 / 3, 0.25] },
    { element: 'C', fract: [0, 0, 0.75] },
    { element: 'C', fract: [2 / 3, 1 / 3, 0.75] },
  ],
  anchors: {},
}

function atomDistance(model: { group: { traverse: (cb: (obj: unknown) => void) => void } }): Map<string, Array<[number, number, number]>> {
  const atoms = new Map<string, Array<[number, number, number]>>()
  model.group.traverse((obj) => {
    const mesh = obj as { userData?: Record<string, unknown>; position?: { x: number; y: number; z: number } }
    if (mesh.userData?.kind !== 'atom' || mesh.userData.ghost || !mesh.position) return
    const element = mesh.userData.element as string
    if (!atoms.has(element)) atoms.set(element, [])
    atoms.get(element)?.push([mesh.position.x, mesh.position.y, mesh.position.z])
  })
  return atoms
}

function minPairDistance(points: Array<[number, number, number]>): number {
  let best = Infinity
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1], points[i][2] - points[j][2])
      if (d < best) best = d
    }
  }
  return best
}

describe('石墨几何断言（需求04 五：与教材对照无学术错误）', () => {
  it('层内 C–C 键长 1.42 Å、层间距 3.355 Å', () => {
    const model = buildCrystalStructure(GRAPHITE, OPTIONS)
    const atoms = atomDistance(model)
    const carbons = atoms.get('C') as Array<[number, number, number]>
    const nn = minPairDistance(carbons)
    expect(Math.abs(nn - 1.42)).toBeLessThan(0.02)
    const layerA = carbons[0][2]
    const layerB = carbons[2][2]
    expect(Math.abs(Math.abs(layerB - layerA) - 3.355)).toBeLessThan(0.01)
  })
})

describe('结构键网络断言（晶体可视化教学正确性）', () => {
  it('钙钛矿 Ti–O 成键、Sr–O 不成键（八面体框架高亮）', async () => {
    const { default: build } = await import('./perovskite')
    const model = build(OPTIONS)
    const bonds: Array<[string, string]> = []
    model.group.traverse((obj) => {
      const mesh = obj as { userData?: Record<string, unknown> }
      if (mesh.userData?.kind !== 'bond') return
      const elements = mesh.userData.elements as [string, string]
      bonds.push(elements)
    })
    expect(bonds.some(([a, b]) => (a === 'Ti' && b === 'O') || (a === 'O' && b === 'Ti'))).toBe(true)
    expect(bonds.some(([a, b]) => (a === 'Sr' && b === 'O') || (a === 'O' && b === 'Sr'))).toBe(false)
  })

  it('萤石 Ca–F 成键、Ca fcc + F 四面体位', async () => {
    const { default: build } = await import('./fluorite')
    const model = build(OPTIONS)
    let caFBonds = 0
    let fFBonds = 0
    model.group.traverse((obj) => {
      const mesh = obj as { userData?: Record<string, unknown> }
      if (mesh.userData?.kind !== 'bond') return
      const [a, b] = mesh.userData.elements as [string, string]
      if ((a === 'Ca' && b === 'F') || (a === 'F' && b === 'Ca')) caFBonds++
      if (a === 'F' && b === 'F') fFBonds++
    })
    expect(caFBonds).toBeGreaterThan(0)
    expect(fFBonds).toBe(0)
  })
})

describe('m-3m 对称元素计数（需求06 五：3×4次轴 + 4×3次轴 + 6×2次轴 + 9镜面 + 1反演）', () => {
  it('元素数量与教材一致', () => {
    const model = buildM3m(OPTIONS)
    let axes4 = 0
    let axes3 = 0
    let axes2 = 0
    let mirrors = 0
    let inversions = 0
    model.group.traverse((obj) => {
      const mesh = obj as { userData?: Record<string, unknown> }
      const kind = mesh.userData?.kind
      if (kind === 'sym-axis' && mesh.userData) {
        const order = mesh.userData.order as number
        if (order === 4) axes4++
        if (order === 3) axes3++
        if (order === 2) axes2++
      } else if (kind === 'sym-mirror') {
        mirrors++
      } else if (kind === 'sym-inversion') {
        inversions++
      }
    })
    expect(axes4).toBe(3)
    expect(axes3).toBe(4)
    expect(axes2).toBe(6)
    expect(mirrors).toBe(9)
    expect(inversions).toBe(1)
  })

  it('-43m 元素计数：3×(-4) + 4×3 + 6 镜面，无反演', () => {
    const model = buildTd(OPTIONS)
    let axesN4 = 0
    let axes3 = 0
    let mirrors = 0
    let inversions = 0
    model.group.traverse((obj) => {
      const mesh = obj as { userData?: Record<string, unknown> }
      const kind = mesh.userData?.kind
      if (kind === 'sym-axis' && mesh.userData) {
        const order = mesh.userData.order as number
        if (order === -4) axesN4++
        if (order === 3) axes3++
      } else if (kind === 'sym-mirror') {
        mirrors++
      } else if (kind === 'sym-inversion') {
        inversions++
      }
    })
    expect(axesN4).toBe(3)
    expect(axes3).toBe(4)
    expect(mirrors).toBe(6)
    expect(inversions).toBe(0)
  })
})
