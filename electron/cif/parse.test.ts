import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCifSource } from './parse'
import { SPACE_GROUPS, HM_INDEX } from './spaceGroups'
import type { CifError } from './errors'

const SAMPLES_DIR = join(process.cwd(), 'resources', 'cif-samples')

function readSample(name: string): string {
  return readFileSync(join(SAMPLES_DIR, name), 'utf8')
}

function readExpectation(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SAMPLES_DIR, name), 'utf8')) as Record<string, unknown>
}

function elementsOf(atoms: Array<{ element: string }>): Record<string, number> {
  const map: Record<string, number> = {}
  for (const atom of atoms) {
    map[atom.element] = (map[atom.element] ?? 0) + 1
  }
  return map
}

function expectCifError(fn: () => unknown): CifError {
  try {
    fn()
  } catch (err) {
    return err as CifError
  }
  throw new Error('预期抛出 CifError，但调用成功返回')
}

const SUCCESS_CASES = [
  'nacl',
  'diamond-symop',
  'srtio3-hm',
  'graphite',
  'asymmetric-only',
  'with-uncertainty',
  'multi-block',
]

describe('金样例逐个断言（cif-pipeline.md 四；testing.md 3.1）', () => {
  for (const name of SUCCESS_CASES) {
    it(`${name}.cif 与 JSON 断言一致`, () => {
      const expected = readExpectation(`${name}.json`)
      const structure = parseCifSource(readSample(`${name}.cif`), `${name}.cif`)
      expect(structure.atoms.length).toBe(expected.atomCount)
      expect(elementsOf(structure.atoms)).toEqual(expected.elements)
      const cell = expected.cell as Record<string, number>
      for (const key of ['a', 'b', 'c', 'alpha', 'beta', 'gamma'] as const) {
        expect(structure.cell[key], `${name} ${key}`).toBeCloseTo(cell[key], 3)
      }
      expect(structure.spaceGroup).toContain(expected.spaceGroupContains as string)
      expect(structure.name.length).toBeGreaterThan(0)
      expect(structure.parseMs).toBeGreaterThanOrEqual(0)
      for (const atom of structure.atoms) {
        for (const value of atom.fract) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThan(1)
        }
      }
    })
  }

  it('broken-line37.cif 报错行号 = 37', () => {
    const expected = readExpectation('broken-line37.json')
    const error = expectCifError(() => parseCifSource(readSample('broken-line37.cif'), 'broken-line37.cif'))
    expect(error.code).toBe(expected.errorCode)
    expect(error.line).toBe(expected.errorLine)
  })

  it('unknown-sg.cif 报 UNKNOWN_SPACEGROUP', () => {
    const expected = readExpectation('unknown-sg.json')
    const error = expectCifError(() => parseCifSource(readSample('unknown-sg.cif'), 'unknown-sg.cif'))
    expect(error.code).toBe(expected.errorCode)
    expect(error.reason).toContain('P 42/m n m x')
  })
})

describe('语法层专项（cif-pipeline.md 二②）', () => {
  it('分号文本块值与普通值可区分', () => {
    const source = [
      'data_text',
      '_a 1',
      '_description',
      ';',
      'first line',
      'second line',
      ';',
      '_b 2',
    ].join('\n')
    const structure = parseCifSource(
      source + '\n_cell_length_a 4\n_cell_length_b 4\n_cell_length_c 4\n_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\nloop_\n_atom_site_label\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nC1 0 0 0\n',
      'text.cif',
    )
    expect(structure.atoms.length).toBe(1)
  })

  it('单双引号值中的空格不拆分', () => {
    const source = [
      "data_quote",
      "_cell_length_a 4",
      "_cell_length_b 4",
      "_cell_length_c 4",
      "_cell_angle_alpha 90",
      "_cell_angle_beta 90",
      "_cell_angle_gamma 90",
      "_chemical_name_common 'two words'",
      "loop_",
      "_atom_site_label",
      "_atom_site_fract_x",
      "_atom_site_fract_y",
      "_atom_site_fract_z",
      "C1 0 0 0",
    ].join('\n')
    const structure = parseCifSource(source, 'quote.cif')
    expect(structure.name).toBe('two words')
  })

  it('注释行与 # 后内容被忽略', () => {
    const source = [
      '# top comment',
      'data_c',
      '_cell_length_a 4 # inline comment',
      '_cell_length_b 4',
      '_cell_length_c 4',
      '_cell_angle_alpha 90',
      '_cell_angle_beta 90',
      '_cell_angle_gamma 90',
      'loop_',
      '_atom_site_label',
      '_atom_site_fract_x',
      '_atom_site_fract_y',
      '_atom_site_fract_z',
      'C1 0 0 0',
    ].join('\n')
    const structure = parseCifSource(source, 'comment.cif')
    expect(structure.cell.a).toBe(4)
  })

  it('save_ 帧内容被跳过但语法校验', () => {
    const source = [
      'data_c',
      '_cell_length_a 4',
      '_cell_length_b 4',
      '_cell_length_c 4',
      '_cell_angle_alpha 90',
      '_cell_angle_beta 90',
      '_cell_angle_gamma 90',
      'save_frame1',
      '_internal_tag value',
      'save_',
      'loop_',
      '_atom_site_label',
      '_atom_site_fract_x',
      '_atom_site_fract_y',
      '_atom_site_fract_z',
      'C1 0 0 0',
    ].join('\n')
    const structure = parseCifSource(source, 'save.cif')
    expect(structure.atoms.length).toBe(1)
  })

  it('未闭合引号报 SYNTAX 且带行号', () => {
    const source = ['data_c', "_a 'unclosed"].join('\n')
    const error = expectCifError(() => parseCifSource(source, 'x.cif'))
    expect(error.code).toBe('SYNTAX')
    expect(error.line).toBe(2)
  })

  it('块外标签报 SYNTAX', () => {
    const error = expectCifError(() => parseCifSource('_tag value\ndata_x\n', 'x.cif'))
    expect(error.code).toBe('SYNTAX')
    expect(error.line).toBe(1)
  })
})

describe('语义层专项（cif-pipeline.md 二③）', () => {
  const CELL = [
    '_cell_length_a 4',
    '_cell_length_b 4',
    '_cell_length_c 4',
    '_cell_angle_alpha 90',
    '_cell_angle_beta 90',
    '_cell_angle_gamma 90',
  ].join('\n')

  const ATOMS = [
    'loop_',
    '_atom_site_label',
    '_atom_site_fract_x',
    '_atom_site_fract_y',
    '_atom_site_fract_z',
    'Na1 0 0 0',
  ].join('\n')

  it('缺晶胞参数报 MISSING_CELL', () => {
    const error = expectCifError(() =>
      parseCifSource(['data_x', ATOMS].join('\n'), 'x.cif'),
    )
    expect(error.code).toBe('MISSING_CELL')
  })

  it('缺原子坐标报 NO_COORDINATE_BLOCK', () => {
    const error = expectCifError(() =>
      parseCifSource(['data_x', CELL].join('\n'), 'x.cif'),
    )
    expect(error.code).toBe('NO_COORDINATE_BLOCK')
  })

  it('无空间群声明时如实标注 P1', () => {
    const structure = parseCifSource(['data_x', CELL, ATOMS].join('\n'), 'x.cif')
    expect(structure.spaceGroup).toBe('P1 (未声明，按 P1)')
    expect(structure.spaceGroupNumber).toBeUndefined()
  })

  it('旧标签 _symmetry_space_group_name_H-M 同样生效', () => {
    const source = ['data_x', CELL, "_symmetry_space_group_name_H-M 'P m -3 m'", ATOMS].join('\n')
    const structure = parseCifSource(source, 'x.cif')
    expect(structure.spaceGroup).toBe('P m -3 m')
    expect(structure.spaceGroupNumber).toBe(221)
  })

  it('H-M 带空格变体与旧式立方记法可识别', () => {
    for (const symbol of ['F m -3 m', 'Fm-3m', 'fm3m', 'F M 3 M'.toLowerCase()]) {
      const source = ['data_x', CELL, `_space_group_name_H-M_alt '${symbol}'`, ATOMS].join('\n')
      const structure = parseCifSource(source, 'x.cif')
      expect(structure.spaceGroupNumber, symbol).toBe(225)
    }
  })

  it('IT 编号直接查表', () => {
    const source = ['data_x', CELL, '_space_group_IT_number 227', ATOMS].join('\n')
    const structure = parseCifSource(source, 'x.cif')
    expect(structure.spaceGroup).toBe('F d -3 m')
  })

  it('Hall 符号声明解析出与查表一致的操作数', () => {
    const source = ['data_x', CELL, "_space_group_name_Hall '-F 4 2 3'", ATOMS].join('\n')
    const structure = parseCifSource(source, 'x.cif')
    expect(structure.atoms.length).toBe(4)
  })

  it('origin choice 1 声明报 NONSTANDARD_SETTING', () => {
    const source = ['data_x', CELL, "_space_group_name_H-M_alt 'F d -3 m:1'", ATOMS].join('\n')
    const error = expectCifError(() => parseCifSource(source, 'x.cif'))
    expect(error.code).toBe('NONSTANDARD_SETTING')
  })

  it('R 群菱方坐标设定报 NONSTANDARD_SETTING', () => {
    const source = ['data_x', CELL, "_space_group_name_H-M_alt 'R -3 c:r'", ATOMS].join('\n')
    const error = expectCifError(() => parseCifSource(source, 'x.cif'))
    expect(error.code).toBe('NONSTANDARD_SETTING')
  })

  it('元素从标签前缀解析（无 type_symbol 列）', () => {
    const source = [
      'data_x',
      CELL,
      'loop_',
      '_atom_site_label',
      '_atom_site_fract_x',
      '_atom_site_fract_y',
      '_atom_site_fract_z',
      'Cl1 0 0 0',
    ].join('\n')
    const structure = parseCifSource(source, 'x.cif')
    expect(structure.atoms[0]?.element).toBe('Cl')
  })

  it('type_symbol 带电荷后缀剥离', () => {
    const source = [
      'data_x',
      CELL,
      'loop_',
      '_atom_site_label',
      '_atom_site_type_symbol',
      '_atom_site_fract_x',
      '_atom_site_fract_y',
      '_atom_site_fract_z',
      'Na1 Na+ 0 0 0',
      'Cl1 Cl- 0.5 0 0',
    ].join('\n')
    const structure = parseCifSource(source, 'x.cif')
    expect(elementsOf(structure.atoms)).toEqual({ Na: 1, Cl: 1 })
  })

  it('占位率随 AtomSite 携带', () => {
    const source = [
      'data_x',
      CELL,
      'loop_',
      '_atom_site_label',
      '_atom_site_fract_x',
      '_atom_site_fract_y',
      '_atom_site_fract_z',
      '_atom_site_occupancy',
      'C1 0 0 0 0.5',
    ].join('\n')
    const structure = parseCifSource(source, 'x.cif')
    expect(structure.atoms[0]?.occupancy).toBe(0.5)
  })
})

describe('边界（testing.md 3.1）', () => {
  it('0.3567(12) 剥析', () => {
    const structure = parseCifSource(readSample('with-uncertainty.cif'), 'with-uncertainty.cif')
    expect(structure.cell.a).toBeCloseTo(5.4309, 3)
  })

  it('10,000 原子上限拒绝', () => {
    const lines = ['data_big', '_cell_length_a 100', '_cell_length_b 100', '_cell_length_c 100', '_cell_angle_alpha 90', '_cell_angle_beta 90', '_cell_angle_gamma 90', 'loop_', '_atom_site_label', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z']
    for (let i = 0; i < 10001; i++) {
      const x = ((i * 7) % 47) / 47
      const y = ((i * 11) % 43) / 43
      const z = ((i * 13) % 41) / 41
      lines.push(`C${i} ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`)
    }
    const source = lines.join('\n')
    const error = expectCifError(() => parseCifSource(source, 'big.cif'))
    expect(error.code).toBe('SYNTAX')
    expect(error.reason).toContain('10000')
  })

  it('性能预算：100 原子级 < 100ms（解析部分）', () => {
    const started = performance.now()
    parseCifSource(readSample('diamond-symop.cif'), 'diamond-symop.cif')
    expect(performance.now() - started).toBeLessThan(100)
  })
})

describe('对称表校验（testing.md 3.1 锚点）', () => {
  it('230 群全量存在', () => {
    for (let n = 1; n <= 230; n++) {
      expect(SPACE_GROUPS[n], `#${n}`).toBeDefined()
      expect(SPACE_GROUPS[n].ops.length).toBeGreaterThan(0)
    }
  })

  it('P1 恰 1 个恒等操作', () => {
    expect(SPACE_GROUPS[1].ops).toEqual(['x,y,z'])
  })

  it('Fm-3m = 192 操作，含 4 个格子平移', () => {
    expect(SPACE_GROUPS[225].ops.length).toBe(192)
    expect(SPACE_GROUPS[225].ops).toContain('x+1/2,y+1/2,z')
  })

  it('H-M 索引覆盖 230 条目', () => {
    expect(Object.keys(HM_INDEX).length).toBe(230)
    expect(HM_INDEX['pm-3m']).toBe(221)
    expect(HM_INDEX['p21/c']).toBe(14)
  })
})
