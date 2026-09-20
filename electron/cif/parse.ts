import { readFileSync, statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { cifError } from './errors'
import { parse } from './parser'
import { extractStructure, type StructureData } from './structure'

const MAX_FILE_BYTES = 5 * 1024 * 1024

export function readCifFile(path: string): { source: string; sizeBytes: number } {
  const stats = statSync(path)
  if (stats.size > MAX_FILE_BYTES) {
    throw cifError('FILE_TOO_LARGE', 0, `${stats.size}`, '')
  }
  const source = readFileSync(path, 'utf8')
  return { source, sizeBytes: stats.size }
}

export function parseCifSource(source: string, fileName: string): StructureData {
  const blocks = parse(source)
  if (blocks.length === 0) {
    throw cifError('NO_COORDINATE_BLOCK', 1, '', '')
  }
  const fileBase = basename(fileName, extname(fileName))
  return extractStructure(blocks, fileName, fileBase)
}

export function openCifFile(path: string, log: (level: 'info' | 'warn' | 'error', message: string) => void): {
  ok: true
  structure: StructureData
} {
  const started = performance.now()
  const { source } = readCifFile(path)
  const structure = parseCifSource(source, basename(path))
  log('info', `perf cif-parse:${basename(path)} ${structure.parseMs}ms total ${Math.round(performance.now() - started)}ms atoms=${structure.atoms.length}`)
  return { ok: true, structure }
}
