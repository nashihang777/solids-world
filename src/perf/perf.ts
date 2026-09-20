const marks = new Map<string, number>()

export function pmark(name: string): void {
  marks.set(name, performance.now())
}

export function pspan(name: string): number {
  const start = marks.get(name)
  if (start === undefined) throw new Error(`pspan 找不到打点：${name}`)
  return performance.now() - start
}

if (import.meta.env.DEV) {
  window.__swPerf = { pmark, pspan }
}
