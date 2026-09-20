import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { writeFileSync } from 'node:fs'
import { log, type LogLevel } from './logging'
import type { Settings } from './storage'
import { openCifFile } from './cif/parse'
import type { CifError } from './cif/errors'
import { saveNote, clearNotes, type NotesMap } from './notes'

export const IPC_CHANNELS = {
  appLog: 'sw:app:log',
  getSettings: 'sw:storage:get-settings',
  setSettings: 'sw:storage:set-settings',
  settingsChanged: 'sw:app:settings-changed',
  cifOpen: 'sw:cif:open',
  recentCif: 'sw:app:recent-cif',
  getNotes: 'sw:storage:get-notes',
  saveNote: 'sw:storage:save-note',
  exportNotes: 'sw:storage:export-notes',
  clearNotes: 'sw:storage:clear-notes',
  showHelp: 'sw:app:show-help',
} as const

export interface IpcDeps {
  win: () => BrowserWindow | null
  getSettings: () => Settings
  setSettings: (next: Settings) => void
  pushRecentCif: (path: string) => void
  getNotes: () => NotesMap
  setNotes: (next: NotesMap) => void
  notesDir: () => string
  pickExportPath: (defaultName: string) => Promise<string | null>
  onNotesChanged: (count: number) => void
}

export function registerIpc(deps: IpcDeps): void {
  ipcMain.handle(IPC_CHANNELS.getSettings, () => deps.getSettings())
  ipcMain.handle(IPC_CHANNELS.setSettings, (_event, next: Settings) => {
    deps.setSettings(next)
    return { ok: true as const }
  })
  ipcMain.on(IPC_CHANNELS.appLog, (_event, payload: { level: LogLevel; message: string }) => {
    log(payload.level, 'renderer', payload.message)
  })
  ipcMain.handle(IPC_CHANNELS.cifOpen, (_event, payload: { path: string }) => {
    try {
      const result = openCifFile(payload.path, (level, message) => log(level, 'cif', message))
      deps.pushRecentCif(payload.path)
      return result
    } catch (err) {
      const error = err as CifError & { code?: string; line?: number; reason?: string; hint?: string }
      if (error.code) {
        return { ok: false as const, error: error as CifError }
      }
      log('error', 'cif', `未分类的解析失败：${String(err)}`)
      return {
        ok: false as const,
        error: {
          code: 'SYNTAX' as const,
          line: 0,
          reason: String(err),
          hint: '文件无法读取或解析',
        },
      }
    }
  })
  ipcMain.handle(IPC_CHANNELS.recentCif, () => ({ paths: deps.getSettings().recentCif }))

  ipcMain.handle(IPC_CHANNELS.getNotes, () => ({ notes: deps.getNotes() }))
  ipcMain.handle(IPC_CHANNELS.saveNote, (_event, payload: { entryId: string; note: string }) => {
    deps.setNotes(saveNote(deps.notesDir(), deps.getNotes(), payload.entryId, payload.note))
    deps.onNotesChanged(Object.keys(deps.getNotes()).length)
    return { ok: true as const }
  })
  ipcMain.handle(IPC_CHANNELS.exportNotes, async (_event, payload: { content: string }) => {
    const filePath = await deps.pickExportPath(`solids-world-notes-${new Date().toISOString().slice(0, 10)}.md`)
    if (!filePath) return { ok: false as const, canceled: true as const }
    writeFileSync(filePath, payload.content, 'utf8')
    log('info', 'notes', `笔记已导出：${filePath}`)
    return { ok: true as const, filePath }
  })
  ipcMain.handle(IPC_CHANNELS.clearNotes, () => {
    deps.setNotes(clearNotes(deps.notesDir()))
    deps.onNotesChanged(Object.keys(deps.getNotes()).length)
    return { ok: true as const }
  })
}

export function broadcastSettings(win: BrowserWindow | null, settings: Settings): void {
  win?.webContents.send(IPC_CHANNELS.settingsChanged, settings)
}
