import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { LogLevel } from './logging'
import type { Settings } from './storage'
import type { CifError } from './cif/errors'
import type { StructureData } from './cif/structure'
import type { Note } from './notes'

export type CifOpenResult =
  | { ok: true; structure: StructureData }
  | { ok: false; error: CifError }

export type ExportNotesResult = { ok: true; filePath: string } | { ok: false; canceled: true }

const solidsApi = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('sw:storage:get-settings'),
  setSettings: (next: Settings): Promise<{ ok: true }> => ipcRenderer.invoke('sw:storage:set-settings', next),
  log: (level: LogLevel, message: string): void => {
    ipcRenderer.send('sw:app:log', { level, message })
  },
  onSettingsChanged: (callback: (next: Settings) => void): (() => void) => {
    const listener = (_event: unknown, next: Settings) => callback(next)
    ipcRenderer.on('sw:app:settings-changed', listener)
    return () => {
      ipcRenderer.removeListener('sw:app:settings-changed', listener)
    }
  },
  openCif: (path: string): Promise<CifOpenResult> => ipcRenderer.invoke('sw:cif:open', { path }),
  pathForFile: (file: File): string => webUtils.getPathForFile(file),
  getRecentCif: (): Promise<{ paths: string[] }> => ipcRenderer.invoke('sw:app:recent-cif'),
  onCifRequestOpen: (callback: (path: string) => void): (() => void) => {
    const listener = (_event: unknown, payload: { path: string }) => callback(payload.path)
    ipcRenderer.on('sw:cif:request-open', listener)
    return () => {
      ipcRenderer.removeListener('sw:cif:request-open', listener)
    }
  },
  getNotes: (): Promise<{ notes: Record<string, Note> }> => ipcRenderer.invoke('sw:storage:get-notes'),
  saveNote: (entryId: string, note: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('sw:storage:save-note', { entryId, note }),
  exportNotes: (content: string): Promise<ExportNotesResult> =>
    ipcRenderer.invoke('sw:storage:export-notes', { content }),
  clearNotes: (): Promise<{ ok: true }> => ipcRenderer.invoke('sw:storage:clear-notes'),
  onRequestExportNotes: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('sw:storage:request-export-notes', listener)
    return () => {
      ipcRenderer.removeListener('sw:storage:request-export-notes', listener)
    }
  },
  onShowHelp: (callback: (topic: 'quickstart' | 'shortcuts') => void): (() => void) => {
    const listener = (_event: unknown, payload: { topic: 'quickstart' | 'shortcuts' }) => callback(payload.topic)
    ipcRenderer.on('sw:app:show-help', listener)
    return () => {
      ipcRenderer.removeListener('sw:app:show-help', listener)
    }
  },
}

contextBridge.exposeInMainWorld('solids', solidsApi)

export type SolidsApi = typeof solidsApi
