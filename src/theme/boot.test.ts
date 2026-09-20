import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { resolveTheme } from './theme'

function runBoot(stored: string | null, mediaLight: boolean): string {
  localStorage.clear()
  if (stored !== null) localStorage.setItem('sw:theme', stored)
  const realMatchMedia = window.matchMedia
  window.matchMedia = ((query: string) => ({
    matches: query.includes('light') ? mediaLight : !mediaLight,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  document.documentElement.removeAttribute('data-theme')
  const match = html.match(/<script id="theme-boot">([\s\S]*?)<\/script>/)
  if (!match) throw new Error('index.html 缺少 theme-boot 脚本')
  new Function(match[1])()
  window.matchMedia = realMatchMedia
  const theme = document.documentElement.dataset.theme ?? ''
  document.documentElement.removeAttribute('data-theme')
  return theme
}

const cases: ReadonlyArray<{ stored: string | null; mediaLight: boolean; expected: 'dark' | 'light' }> = [
  { stored: 'dark', mediaLight: true, expected: 'dark' },
  { stored: 'dark', mediaLight: false, expected: 'dark' },
  { stored: 'light', mediaLight: true, expected: 'light' },
  { stored: 'light', mediaLight: false, expected: 'light' },
  { stored: 'system', mediaLight: true, expected: 'light' },
  { stored: 'system', mediaLight: false, expected: 'dark' },
  { stored: null, mediaLight: true, expected: 'light' },
  { stored: null, mediaLight: false, expected: 'dark' },
]

describe('theme-boot 与 resolveTheme 同源对答案（testing.md 3.2 主题契约）', () => {
  for (const c of cases) {
    it(`stored=${c.stored} mediaLight=${c.mediaLight} -> ${c.expected}`, () => {
      expect(runBoot(c.stored, c.mediaLight)).toBe(c.expected)
      const resolveInput = c.stored === 'dark' || c.stored === 'light' ? c.stored : 'system'
      expect(resolveTheme(resolveInput, c.mediaLight)).toBe(c.expected)
    })
  }
})
