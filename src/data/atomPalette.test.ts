import { describe, expect, it } from 'vitest'
import { ATOM_SLOTS, assignAtomColors, atomicNumber, FREE_ARCS } from './atomPalette'

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function hexToLinear(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
}

interface Oklab {
  L: number
  a: number
  b: number
}

function linearToOklab(r: number, g: number, b: number): Oklab {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

function oklabOf(hex: string): Oklab {
  const [r, g, b] = hexToLinear(hex)
  return linearToOklab(r, g, b)
}

interface Oklch {
  L: number
  C: number
  H: number
}

function oklchOf(hex: string): Oklch {
  const { L, a, b } = oklabOf(hex)
  const h = (Math.atan2(b, a) * 180) / Math.PI
  return { L, C: Math.sqrt(a * a + b * b), H: (h + 360) % 360 }
}

function deltaE(hexA: string, hexB: string): number {
  const p = oklabOf(hexA)
  const q = oklabOf(hexB)
  return Math.sqrt((p.L - q.L) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2)
}

function hueInFreeArcs(h: number): boolean {
  const hue = ((h % 360) + 360) % 360
  return FREE_ARCS.some((arc) => {
    const lo = ((arc.h[0] % 360) + 360) % 360
    const hi = ((arc.h[1] % 360) + 360) % 360
    if (lo <= hi) return hue >= lo && hue <= hi
    return hue >= lo || hue <= hi
  })
}

describe('原子动态配色契约（visual-design.md 8.1；testing.md 3.2）', () => {
  it('8 个色槽的标称色相全部落入自由三弧（蓝 222-276 / 玫瑰 322-373 / 黄绿 95-138）', () => {
    for (const slot of ATOM_SLOTS) {
      expect(hueInFreeArcs(slot.h), `槽位 h=${slot.h} 不在自由弧内`).toBe(true)
    }
  })

  it('色槽参考 hex（暗色）与标称 OKLCH 值互相锁定', () => {
    for (const slot of ATOM_SLOTS) {
      const got = oklchOf(slot.dark)
      expect(Math.abs(got.L - slot.l), `${slot.dark} L`).toBeLessThan(0.015)
      expect(Math.abs(got.C - slot.c), `${slot.dark} C`).toBeLessThan(0.01)
      const hDelta = Math.min(Math.abs(got.H - slot.h), 360 - Math.abs(got.H - slot.h))
      expect(hDelta, `${slot.dark} H`).toBeLessThan(2)
    }
  })

  it('色槽参考 hex（浅色）= 标称 OKLCH 降明度减彩度（L−0.13 / C×0.85）且比暗色更暗', () => {
    for (const slot of ATOM_SLOTS) {
      const dark = oklchOf(slot.dark)
      const light = oklchOf(slot.light)
      const hDelta = Math.min(Math.abs(light.H - slot.h), 360 - Math.abs(light.H - slot.h))
      expect(hDelta, `${slot.light} H`).toBeLessThan(4)
      expect(Math.abs(light.C - slot.c * 0.85), `${slot.light} C`).toBeLessThan(0.012)
      expect(Math.abs(light.L - (slot.l - 0.13)), `${slot.light} L`).toBeLessThan(0.02)
      expect(light.L, `${slot.light} 应比 ${slot.dark} 更暗`).toBeLessThan(dark.L)
    }
  })

  it('首 6 槽两两 ΔE(OKLab) ≥ 0.1（暗色与浅色两套）', () => {
    for (const key of ['dark', 'light'] as const) {
      for (let i = 0; i < 6; i++) {
        for (let j = i + 1; j < 6; j++) {
          const de = deltaE(ATOM_SLOTS[i][key], ATOM_SLOTS[j][key])
          expect(de, `${key} 槽 ${i + 1}-${j + 1} ΔE=${de.toFixed(3)}`).toBeGreaterThanOrEqual(0.1)
        }
      }
    }
  })

  it('assignAtomColors 是纯函数：同输入同输出', () => {
    const first = assignAtomColors(['Na', 'Cl', 'Cs', 'C'])
    const second = assignAtomColors(['Na', 'Cl', 'Cs', 'C'])
    for (const element of ['Na', 'Cl', 'Cs', 'C']) {
      expect(first.get(element)?.dark).toBe(second.get(element)?.dark)
      expect(first.get(element)?.light).toBe(second.get(element)?.light)
    }
  })

  it('按原子序数升序分配槽位：Na(Z=11) 先于 Cl(Z=17)', () => {
    const colors = assignAtomColors(['Cl', 'Na'])
    expect(colors.get('Na')?.h).toBe(ATOM_SLOTS[0].h)
    expect(colors.get('Cl')?.h).toBe(ATOM_SLOTS[1].h)
  })

  it('同结构同元素同槽、异元素异槽', () => {
    const colors = assignAtomColors(['Na', 'Cl', 'Na'])
    expect(colors.size).toBe(2)
    const pair = assignAtomColors(['H', 'He'])
    const first = pair.get('H')
    const second = pair.get('He')
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first?.dark).not.toBe(second?.dark)
  })

  it('第 9 个元素起循环槽位并降饱和（c × 0.6）', () => {
    const elements = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F']
    const colors = assignAtomColors(elements)
    const ninth = colors.get('F')
    expect(ninth?.h).toBe(ATOM_SLOTS[0].h)
    expect(ninth?.c).toBe(Math.round(ATOM_SLOTS[0].c * 0.6 * 1000) / 1000)
    expect(ninth?.c).toBeLessThan(ATOM_SLOTS[0].c)
  })

  it('atomicNumber 对未知元素抛错', () => {
    expect(() => atomicNumber('Xx')).toThrow('未知元素符号')
  })
})
