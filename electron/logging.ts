import { appendFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const RETENTION_DAYS = 30

let logDir: string | null = null
const t0 = Date.now()

function localDayStamp(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function stampToTime(stamp: string): number {
  return new Date(Number(stamp.slice(0, 4)), Number(stamp.slice(4, 6)) - 1, Number(stamp.slice(6, 8))).getTime()
}

function todayStart(): number {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function logFilePath(): string {
  return join(logDir as string, `sw-${localDayStamp()}.log`)
}

export function initLogging(dir: string): void {
  logDir = dir
  mkdirSync(dir, { recursive: true })
  const now = todayStart()
  for (const name of readdirSync(dir)) {
    if (!/^sw-\d{8}\.log$/.test(name)) continue
    const age = (now - stampToTime(name.slice(3, 11))) / 86400000
    if (age > RETENTION_DAYS) {
      rmSync(join(dir, name))
    }
  }
  log('info', 'logging', `日志系统就绪：${dir}`)
}

export function log(level: LogLevel, scope: string, message: string): void {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  const line = `[${hh}:${mm}:${ss}.${ms}] [${level}] [${scope}] ${message}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
  if (logDir) {
    appendFileSync(logFilePath(), line + '\n', 'utf8')
  }
}

export function mark(name: string): void {
  log('info', 'perf', `${name} +${Date.now() - t0}ms`)
}
