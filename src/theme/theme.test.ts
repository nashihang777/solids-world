import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme（visual-design.md 一：跟随系统，无偏好默认暗色）', () => {
  it('显式选择优先于系统偏好', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('light', false)).toBe('light')
  })

  it('system 跟随系统，无系统偏好时默认暗色', () => {
    expect(resolveTheme('system', true)).toBe('light')
    expect(resolveTheme('system', false)).toBe('dark')
  })
})
