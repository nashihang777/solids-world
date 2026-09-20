import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, settingsPath } from './storage'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sw-store-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('settings.json 读写（data-contracts.md 六）', () => {
  it('无 settings.json 时返回默认设置且不告警', () => {
    const warnings: string[] = []
    const loaded = loadSettings(dir, (m) => warnings.push(m))
    expect(loaded).toEqual(DEFAULT_SETTINGS)
    expect(warnings).toEqual([])
  })

  it('设置保存后可原样读回', () => {
    const next = {
      ...DEFAULT_SETTINGS,
      theme: 'light' as const,
      locale: 'en' as const,
      window: { ...DEFAULT_SETTINGS.window, libraryCollapsed: true },
    }
    saveSettings(dir, next)
    const warnings: string[] = []
    expect(loadSettings(dir, (m) => warnings.push(m))).toEqual(next)
    expect(warnings).toEqual([])
  })

  it('损坏的 JSON 返回默认设置并写入告警', () => {
    writeFileSync(settingsPath(dir), '{broken', 'utf8')
    const warnings: string[] = []
    const loaded = loadSettings(dir, (m) => warnings.push(m))
    expect(loaded).toEqual(DEFAULT_SETTINGS)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('settings.json 解析失败')
  })
})
