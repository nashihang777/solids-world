import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, beforeAll } from 'vitest'
import * as THREE from 'three'
import { parseCifSource } from '../../electron/cif/parse'
import type { EntryModel } from './kit'
import { buildFromStructureData } from './customStructure'

const SAMPLES = join(process.cwd(), 'resources', 'cif-samples')

const OPTIONS = {
  supercell: 1 as const,
  theme: 'dark' as const,
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
        pos: (obj as THREE.Mesh).position,
        ghost: obj.userData.ghost === true,
      })
    }
  })
  return atoms
}

describe('StructureData → 晶体渲染接管（需求 08 五；three-rendering.md 3.2）', () => {
  let graphiteModel: EntryModel
  let diamondModel: EntryModel

  beforeAll(() => {
    window.solids = { log: () => undefined } as unknown as Window['solids']
    const graphite = parseCifSource(readFileSync(join(SAMPLES, 'graphite.cif'), 'utf8'), 'graphite.cif')
    graphiteModel = buildFromStructureData(graphite, OPTIONS)
    const diamond = parseCifSource(readFileSync(join(SAMPLES, 'diamond-symop.cif'), 'utf8'), 'diamond-symop.cif')
    diamondModel = buildFromStructureData(diamond, OPTIONS)
  })

  it('石墨六方晶胞：非幽灵原子 4 个 C', () => {
    const atoms = collectAtoms(graphiteModel).filter((atom) => !atom.ghost)
    expect(atoms.length).toBe(4)
    expect(atoms.every((atom) => atom.element === 'C')).toBe(true)
  })

  it('六方矩阵正确：b 基矢笛卡尔分量 = (a·cos120°, a·sin120°, 0)', () => {
    const a = 2.464
    const atoms = collectAtoms(graphiteModel)
    const zQuarter = atoms.filter((atom) => Math.abs(atom.pos.z - 6.71 * 0.25) < 1e-6 && !atom.ghost)
    expect(zQuarter.length).toBe(2)
    const bExpectedX = a * Math.cos((120 * Math.PI) / 180)
    const bExpectedY = a * Math.sin((120 * Math.PI) / 180)
    expect(bExpectedX).toBeCloseTo(-1.232, 3)
    expect(bExpectedY).toBeCloseTo(2.134, 3)
    const c2 = zQuarter.find((atom) => Math.abs(atom.pos.x - (a + 2 * bExpectedX) / 3) < 0.4)
    expect(c2).toBeDefined()
  })

  it('石墨层内最近邻键长 ≈ 1.42 Å（a/√3）', () => {
    const atoms = collectAtoms(graphiteModel).filter((atom) => !atom.ghost)
    let nearest = Infinity
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        nearest = Math.min(nearest, atoms[i].pos.distanceTo(atoms[j].pos))
      }
    }
    const ghosted = collectAtoms(graphiteModel)
    for (let i = 0; i < ghosted.length; i++) {
      for (let j = i + 1; j < ghosted.length; j++) {
        if (ghosted[i].ghost && ghosted[j].ghost) continue
        nearest = Math.min(nearest, ghosted[i].pos.distanceTo(ghosted[j].pos))
      }
    }
    expect(nearest).toBeGreaterThan(1.3)
    expect(nearest).toBeLessThan(1.5)
  })

  it('金刚石 symop 样例：渲染 8 个 C 且存在 109.47° 键角（邻居经跨界补全）', () => {
    const core = collectAtoms(diamondModel).filter((atom) => !atom.ghost)
    expect(core.length).toBe(8)
    const a = 3.567
    const origin = core.find(
      (atom) =>
        Math.abs(atom.pos.x - a / 8) < 1e-4 &&
        Math.abs(atom.pos.y - a / 8) < 1e-4 &&
        Math.abs(atom.pos.z - a / 8) < 1e-4,
    )
    expect(origin).toBeDefined()
    const all = collectAtoms(diamondModel)
    const neighbors = all.filter(
      (atom) => atom !== origin && Math.abs(atom.pos.distanceTo((origin as AtomInfo).pos) - (a * Math.sqrt(3)) / 4) < 1e-3,
    )
    expect(neighbors.length).toBe(4)
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const u = neighbors[i].pos.clone().sub((origin as AtomInfo).pos).normalize()
        const v = neighbors[j].pos.clone().sub((origin as AtomInfo).pos).normalize()
        const angle = (Math.acos(u.dot(v)) * 180) / Math.PI
        expect(angle).toBeCloseTo(109.47, 1)
      }
    }
  })

  it('超胞 2×2×2 重建与缓存命中（同 key 复用同一模型对象）', () => {
    const graphite = parseCifSource(readFileSync(join(SAMPLES, 'graphite.cif'), 'utf8'), 'graphite.cif')
    const first = buildFromStructureData(graphite, OPTIONS)
    const second = buildFromStructureData(graphite, OPTIONS)
    expect(second).toBe(first)
    const supercellModel = buildFromStructureData(graphite, { ...OPTIONS, supercell: 2 })
    expect(supercellModel).not.toBe(first)
    const atoms2x2 = collectAtoms(supercellModel).filter((atom) => !atom.ghost)
    expect(atoms2x2.length).toBe(32)
  })

  it('模型 radius 覆盖超胞包围盒（取景可用）', () => {
    const graphite = parseCifSource(readFileSync(join(SAMPLES, 'graphite.cif'), 'utf8'), 'graphite.cif')
    const supercellModel = buildFromStructureData(graphite, { ...OPTIONS, supercell: 2 })
    expect(supercellModel.radius).toBeGreaterThan(graphiteModel.radius)
  })

  it('Si 结构（with-uncertainty.cif）成功构建（回归：半径表缺 Si 曾致同步抛错）', () => {
    const silicon = parseCifSource(readFileSync(join(SAMPLES, 'with-uncertainty.cif'), 'utf8'), 'with-uncertainty.cif')
    const model = buildFromStructureData(silicon, OPTIONS)
    const atoms = collectAtoms(model).filter((atom) => !atom.ghost)
    expect(atoms.length).toBe(8)
    expect(atoms.every((atom) => atom.element === 'Si')).toBe(true)
    let bonds = 0
    model.group.traverse((obj) => {
      if (obj.userData?.kind === 'bond') bonds++
    })
    expect(bonds).toBeGreaterThan(0)
  })

  it('缓存命中时重置共享模型的 transform（回归：exit 缩放曾污染缓存对象）', () => {
    const graphite = parseCifSource(readFileSync(join(SAMPLES, 'graphite.cif'), 'utf8'), 'graphite.cif')
    const first = buildFromStructureData(graphite, OPTIONS)
    first.group.scale.setScalar(0.001)
    first.group.rotation.set(1, 2, 3)
    const second = buildFromStructureData(graphite, OPTIONS)
    expect(second).toBe(first)
    expect(second.group.scale.x).toBe(1)
    expect(second.group.rotation.y).toBe(0)
  })

  it('金样例全部元素可构建（半径表覆盖守卫）', () => {
    const samples = [
      'nacl.cif',
      'diamond-symop.cif',
      'srtio3-hm.cif',
      'graphite.cif',
      'asymmetric-only.cif',
      'with-uncertainty.cif',
      'multi-block.cif',
    ]
    const elements = new Set<string>()
    for (const name of samples) {
      const structure = parseCifSource(readFileSync(join(SAMPLES, name), 'utf8'), name)
      for (const atom of structure.atoms) elements.add(atom.element)
      buildFromStructureData(structure, OPTIONS)
    }
    expect([...elements].sort()).toEqual(['Ba', 'C', 'Cl', 'Na', 'O', 'Si', 'Sr', 'Ti'])
  })
})
