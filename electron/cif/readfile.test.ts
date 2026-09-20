import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { openCifFile, readCifFile } from './parse'
import type { CifError } from './errors'

const workDir = mkdtempSync(join(tmpdir(), 'sw-cif-boundary-'))

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

function writeTempCif(name: string, content: string): string {
  const path = join(workDir, name)
  writeFileSync(path, content, 'utf8')
  return path
}

const validBody = [
  'data_boundary',
  "_chemical_name_common 'boundary probe'",
  '_cell_length_a 4.0',
  '_cell_length_b 4.0',
  '_cell_length_c 4.0',
  '_cell_angle_alpha 90.0',
  '_cell_angle_beta 90.0',
  '_cell_angle_gamma 90.0',
  'loop_',
  '_atom_site_label',
  '_atom_site_fract_x',
  '_atom_site_fract_y',
  '_atom_site_fract_z',
  'C1 0.0 0.0 0.0',
].join('\n')

describe('5 MB 边界（需求 08 七-3：4.9MB 正常、5.1MB 拒绝）', () => {
  it('4.9 MB 文件正常解析', () => {
    const padLines: string[] = ['# ' + 'x'.repeat(78)]
    const needed = 4.9 * 1024 * 1024
    let size = new TextEncoder().encode(validBody).length
    while (size < needed) {
      padLines.push('# ' + 'x'.repeat(78))
      size += 80
    }
    const path = writeTempCif('under.cif', padLines.join('\n') + '\n' + validBody + '\n')
    const { source, sizeBytes } = readCifFile(path)
    expect(source.length).toBeGreaterThan(0)
    expect(sizeBytes).toBeLessThanOrEqual(5 * 1024 * 1024)
    const result = openCifFile(path, () => undefined)
    expect(result.structure.atoms.length).toBe(1)
  })

  it('5.1 MB 文件拒绝并抛 FILE_TOO_LARGE', () => {
    const padLines: string[] = []
    const needed = 5.1 * 1024 * 1024
    let size = 0
    while (size < needed) {
      padLines.push('# ' + 'x'.repeat(78))
      size += 80
    }
    const path = writeTempCif('over.cif', padLines.join('\n') + '\n')
    let caught: CifError | null = null
    try {
      readCifFile(path)
    } catch (err) {
      caught = err as CifError
    }
    expect(caught?.code).toBe('FILE_TOO_LARGE')
  })
})
