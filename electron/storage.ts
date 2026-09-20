import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface WindowState {
  width: number
  height: number
  libraryCollapsed: boolean
  detailCollapsed: boolean
}

export type ThemeSetting = 'system' | 'dark' | 'light'
export type LocaleSetting = 'zh' | 'en'

export interface Settings {
  theme: ThemeSetting
  locale: LocaleSetting
  window: WindowState
  lastEntryId: string
  recentCif: string[]
  lessonDone: string[]
  quizPassed: string[]
  postfx: boolean
  bondTolerance: number
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  locale: 'zh',
  window: { width: 1280, height: 800, libraryCollapsed: false, detailCollapsed: false },
  lastEntryId: '',
  recentCif: [],
  lessonDone: [],
  quizPassed: [],
  postfx: true,
  bondTolerance: 1.15,
}

export function settingsPath(dir: string): string {
  return join(dir, 'settings.json')
}

function freshDefaults(): Settings {
  return { ...DEFAULT_SETTINGS, window: { ...DEFAULT_SETTINGS.window } }
}

export function loadSettings(dir: string, warn: (message: string) => void): Settings {
  try {
    const raw = readFileSync(settingsPath(dir), 'utf8')
    return JSON.parse(raw) as Settings
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      warn(`settings.json 解析失败，使用默认设置：${String(err)}`)
    }
    return freshDefaults()
  }
}

export function saveSettings(dir: string, settings: Settings): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath(dir), JSON.stringify(settings, null, 2), 'utf8')
}
