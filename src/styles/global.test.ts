import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/styles/global.css'), 'utf8')

const BASE_TOKENS = [
  '--canvas',
  '--paper',
  '--paper-solid',
  '--raise',
  '--chalk',
  '--chalk-bright',
  '--on-primary',
  '--primary-a',
  '--primary-b',
  '--ink',
  '--muted',
  '--danger',
  '--hotspot-card',
  '--hairline',
  '--sky-a',
  '--sky-b',
  '--tone-cyan',
  '--tone-jade',
  '--tone-amber',
  '--tone-violet',
]

const LIGHT_OVERRIDE_TOKENS = BASE_TOKENS.filter((t) => t !== '--hotspot-card')

function extractBlock(prefix: string): string {
  const start = css.indexOf(prefix)
  if (start === -1) throw new Error(`global.css 缺少块：${prefix}`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

function tokensOf(block: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g
  for (const m of block.matchAll(re)) {
    map.set(m[1], m[2].trim())
  }
  return map
}

const darkTokens = tokensOf(extractBlock(':root'))
const lightTokens = tokensOf(extractBlock(":root[data-theme='light']"))

describe('主题 token 契约（visual-design.md 二）', () => {
  it('暗色 :root 定义全部 20 个设计 token', () => {
    for (const token of BASE_TOKENS) {
      expect(darkTokens.has(token), token).toBe(true)
    }
  })

  it('浅色主题重定义除 hotspot-card 外的全部 token', () => {
    for (const token of LIGHT_OVERRIDE_TOKENS) {
      expect(lightTokens.has(token), token).toBe(true)
    }
    expect(lightTokens.has('--hotspot-card')).toBe(false)
  })

  it('浅色 token 值与暗色全部不同', () => {
    for (const token of LIGHT_OVERRIDE_TOKENS) {
      expect(lightTokens.get(token), token).not.toBe(darkTokens.get(token))
    }
  })
})

function srgbToLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '').slice(0, 6)
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

describe('双主题对比度 WCAG AA ≥ 4.5:1（visual-design.md 九）', () => {
  const pairs: ReadonlyArray<{ fg: string; bg: string; tokens: Map<string, string>; label: string }> = [
    { fg: '--ink', bg: '--canvas', tokens: darkTokens, label: '暗色' },
    { fg: '--muted', bg: '--canvas', tokens: darkTokens, label: '暗色' },
    { fg: '--on-primary', bg: '--primary-a', tokens: darkTokens, label: '暗色' },
    { fg: '--ink', bg: '--canvas', tokens: lightTokens, label: '浅色' },
    { fg: '--muted', bg: '--canvas', tokens: lightTokens, label: '浅色' },
    { fg: '--on-primary', bg: '--primary-a', tokens: lightTokens, label: '浅色' },
  ]
  for (const p of pairs) {
    it(`${p.label}：${p.fg} on ${p.bg} ≥ 4.5:1`, () => {
      const ratio = contrast(p.tokens.get(p.fg) as string, p.tokens.get(p.bg) as string)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })
  }
})
