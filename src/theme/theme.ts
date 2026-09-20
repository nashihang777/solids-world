export type ThemeSetting = 'system' | 'dark' | 'light'
export type ResolvedTheme = 'dark' | 'light'

export function resolveTheme(theme: ThemeSetting, systemPrefersLight: boolean): ResolvedTheme {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return systemPrefersLight ? 'light' : 'dark'
}

export function applyTheme(theme: ThemeSetting): void {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  document.documentElement.dataset.theme = resolveTheme(theme, mq.matches)
  try {
    localStorage.setItem('sw:theme', theme)
  } catch {
    return
  }
}
