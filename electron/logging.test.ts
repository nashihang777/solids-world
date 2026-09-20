import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initLogging, log, mark } from './logging'

let dir: string

function dayStamp(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sw-log-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('日志系统（architecture.md 四：双写、按日滚动、保留 30 天）', () => {
  it('日志写入按日命名的文件且包含级别与域', () => {
    initLogging(dir)
    log('info', 'test', 'hello solids')
    const file = join(dir, `sw-${dayStamp(new Date())}.log`)
    expect(existsSync(file)).toBe(true)
    expect(readFileSync(file, 'utf8')).toContain('[info] [test] hello solids')
  })

  it('超过 30 天的旧日志被清理，近期日志保留', () => {
    writeFileSync(join(dir, 'sw-20200101.log'), 'old\n', 'utf8')
    const recentStamp = dayStamp(new Date(Date.now() - 3 * 86400000))
    writeFileSync(join(dir, `sw-${recentStamp}.log`), 'recent\n', 'utf8')
    initLogging(dir)
    expect(existsSync(join(dir, 'sw-20200101.log'))).toBe(false)
    expect(existsSync(join(dir, `sw-${recentStamp}.log`)).toString()).toBe('true')
  })

  it('mark 写入 perf 域并带耗时', () => {
    initLogging(dir)
    mark('test:mark')
    const file = join(dir, `sw-${dayStamp(new Date())}.log`)
    const content = readFileSync(file, 'utf8')
    expect(content).toContain('[perf] test:mark +')
    expect(content).toContain('ms')
  })
})
