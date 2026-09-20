import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface Note {
  text: string
  at: number
}

export type NotesMap = Record<string, Note>

export function notesPath(dir: string): string {
  return join(dir, 'notes.json')
}

export function loadNotes(dir: string, warn: (message: string) => void): NotesMap {
  try {
    const raw = readFileSync(notesPath(dir), 'utf8')
    return JSON.parse(raw) as NotesMap
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      warn(`notes.json 解析失败，忽略已有笔记：${String(err)}`)
    }
    return {}
  }
}

export function saveNote(dir: string, notes: NotesMap, entryId: string, text: string): NotesMap {
  const next: NotesMap = { ...notes }
  if (text.trim().length === 0) {
    delete next[entryId]
  } else {
    next[entryId] = { text, at: Date.now() }
  }
  mkdirSync(dir, { recursive: true })
  writeFileSync(notesPath(dir), JSON.stringify(next, null, 2), 'utf8')
  return next
}

export function clearNotes(dir: string): NotesMap {
  mkdirSync(dir, { recursive: true })
  writeFileSync(notesPath(dir), '{}', 'utf8')
  return {}
}
