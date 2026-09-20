import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import type { BuildOptions, EntryModel } from '../kit'
import { buildCrystalStructure, cubicCell } from './crystal-structure-'
import buildNaCl from './nacl'
import buildDiamond from './diamond'
import buildCsCl from './cscl'

const OPTIONS: BuildOptions = {
  supercell: 1,
  theme: 'dark',
  bondTolerance: 1.15,
  palette: { muted: '#93a8b0', ink: '#e9f1f2' },
}

interface AtomInfo {
  element: string
  pos: THREE.Vector3
  ghost: boolean
}

function collectAtoms(model: EntryModel): AtomInfo[] {
  const atoms: AtomInfo[] = []
  model.group.traverse((obj) => {
    if (obj.userData?.kind === 'atom') {
      atoms.push({
        element: obj.userData.element as string,
        pos: (obj as THREE.Mesh).position.clone(),
        ghost: obj.userData.ghost === true,
      })
    }
  })
  return atoms
}

function collectBonds(model: EntryModel): Array<[string, string]> {
  const bonds: Array<[string, string]> = []
  model.group.traverse((obj) => {
    if (obj.userData?.kind === 'bond') {
      const elements = obj.userData.elements as [string, string]
      bonds.push([...elements].sort() as [string, string])
    }
  })
  return bonds
}

function triangleCount(model: EntryModel): number {
  let total = 0
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    const geometry = mesh.geometry as THREE.BufferGeometry | undefined
    if (!geometry) return
    if (geometry.index) total += geometry.index.count / 3
    else if (geometry.attributes.position) total += geometry.attributes.position.count / 3
  })
  return total
}

function countByElement(atoms: AtomInfo[], ghost: boolean): Map<string, number> {
  const map = new Map<string, number>()
  for (const atom of atoms) {
    if (atom.ghost !== ghost) continue
    map.set(atom.element, (map.get(atom.element) ?? 0) + 1)
  }
  return map
}

describe('岩盐结构几何断言（testing.md 3.3）', () => {
  const model = buildNaCl(OPTIONS)
  const atoms = collectAtoms(model)

  it('展开后 Na 4 + Cl 4（非幽灵原子）', () => {
    const nonGhost = countByElement(atoms, false)
    expect(nonGhost.get('Na')).toBe(4)
    expect(nonGhost.get('Cl')).toBe(4)
  })

  it('Na–Cl 最近邻距离 = a/2 = 2.82 Å', () => {
    const na = atoms.filter((atom) => atom.element === 'Na' && !atom.ghost)
    const cl = atoms.filter((atom) => atom.element === 'Cl' && !atom.ghost)
    let nearest = Infinity
    for (const p of na) {
      for (const q of cl) {
        nearest = Math.min(nearest, p.pos.distanceTo(q.pos))
      }
    }
    expect(nearest).toBeCloseTo(5.64 / 2, 2)
  })

  it('所有键均为 Na–Cl（无 Na–Na / Cl–Cl）', () => {
    const bonds = collectBonds(model)
    expect(bonds.length).toBeGreaterThan(0)
    for (const pair of bonds) {
      expect(pair).toEqual(['Cl', 'Na'])
    }
  })

  it('anchors 覆盖数据层声明的键接缝', () => {
    for (const key of ['na-site', 'cl-site', 'na-cl-bond']) {
      expect(model.anchors[key], key).toBeDefined()
    }
  })
})

describe('金刚石结构几何断言（testing.md 3.3）', () => {
  const model = buildDiamond(OPTIONS)
  const atoms = collectAtoms(model)

  it('C 8（非幽灵原子）', () => {
    const nonGhost = countByElement(atoms, false)
    expect(nonGhost.get('C')).toBe(8)
  })

  it('正四面体键角 109.47°（arccos(−1/3)）', () => {
    const a = 3.567
    const threshold = 0.77 * 2 * 1.15
    const origin = atoms.find((atom) => !atom.ghost && atom.pos.length() < 1e-6)
    expect(origin).toBeDefined()
    const neighbors = atoms.filter(
      (atom) => atom !== origin && atom.pos.distanceTo((origin as AtomInfo).pos) <= threshold,
    )
    expect(neighbors.length).toBe(4)
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const u = neighbors[i].pos.clone().sub((origin as AtomInfo).pos).normalize()
        const v = neighbors[j].pos.clone().sub((origin as AtomInfo).pos).normalize()
        const angleDeg = (Math.acos(u.dot(v)) * 180) / Math.PI
        expect(angleDeg).toBeCloseTo(109.47, 1)
      }
    }
    const bondLength = neighbors[0].pos.distanceTo((origin as AtomInfo).pos)
    expect(bondLength).toBeCloseTo((a * Math.sqrt(3)) / 4, 2)
  })
})

describe('氯化铯结构几何断言（testing.md 3.3）', () => {
  const model = buildCsCl(OPTIONS)
  const atoms = collectAtoms(model)

  it('Cs 1 + Cl 1（非幽灵原子）', () => {
    const nonGhost = countByElement(atoms, false)
    expect(nonGhost.get('Cs')).toBe(1)
    expect(nonGhost.get('Cl')).toBe(1)
  })

  it('体心 Cl⁻ 配位数为 8（8 个 Cs⁺ 最近邻）', () => {
    const center = atoms.find((atom) => atom.element === 'Cl' && !atom.ghost)
    expect(center).toBeDefined()
    const threshold = (1.74 + 1.7) * 1.15
    const neighbors = atoms.filter(
      (atom) => atom.element === 'Cs' && atom.pos.distanceTo((center as AtomInfo).pos) <= threshold,
    )
    expect(neighbors.length).toBe(8)
  })
})

describe('超胞与预算断言（three-rendering.md 3.2；performance.md 一）', () => {
  it('2×2×2 超胞：Na 32 + Cl 32（非幽灵）且存在跨界补全原子', () => {
    const model = buildNaCl({ ...OPTIONS, supercell: 2 })
    const atoms = collectAtoms(model)
    const nonGhost = countByElement(atoms, false)
    expect(nonGhost.get('Na')).toBe(32)
    expect(nonGhost.get('Cl')).toBe(32)
    expect(atoms.some((atom) => atom.ghost)).toBe(true)
  })

  it('2×2×2 超胞岩盐三角面总数 ≤ 40000', () => {
    const model = buildNaCl({ ...OPTIONS, supercell: 2 })
    expect(triangleCount(model)).toBeLessThanOrEqual(40000)
  })

  it('浅色主题原子球附描边轮廓（visual-design.md 8.1）', () => {
    const model = buildNaCl({ ...OPTIONS, theme: 'light' })
    let outlined = 0
    model.group.traverse((obj) => {
      if (obj.userData?.kind === 'atom' && obj.children.length > 0) outlined += 1
    })
    expect(outlined).toBeGreaterThan(0)
  })
})

describe('家族防呆（three-rendering.md 3.2）', () => {
  it('同元素坐标重合（< 0.4 Å）抛错', () => {
    expect(() =>
      buildCrystalStructure(
        {
          cell: cubicCell(5),
          atoms: [
            { element: 'Na', fract: [0, 0, 0] },
            { element: 'Na', fract: [0.001, 0, 0] },
          ],
          anchors: {},
        },
        OPTIONS,
      ),
    ).toThrow('重合')
  })
})
