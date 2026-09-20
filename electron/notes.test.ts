import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearNotes, loadNotes, notesPath, saveNote } from './notes'

const dirs: string[] = []

function freshDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sw-notes-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('观察笔记存储（interaction-design.md 七）', () => {
  it('保存后可读回，时间戳为保存时刻', () => {
    const dir = freshDir()
    const warn = vi.fn()
    let notes = loadNotes(dir, warn)
    expect(notes).toEqual({})
    notes = saveNote(dir, notes, 'diamond', 'fcc + 基元(0,0,0)+(1/4,1/4,1/4)')
    const reloaded = loadNotes(dir, warn)
    expect(reloaded['diamond']?.text).toBe('fcc + 基元(0,0,0)+(1/4,1/4,1/4)')
    expect(reloaded['diamond']?.at).toBeGreaterThan(0)
    expect(warn).not.toHaveBeenCalled()
  })

  it('清空文本即删除该条笔记', () => {
    const dir = freshDir()
    let notes = saveNote(dir, {}, 'nacl', '六配位')
    expect(notes['nacl']).toBeDefined()
    notes = saveNote(dir, notes, 'nacl', '   ')
    expect(notes['nacl']).toBeUndefined()
    expect(loadNotes(dir, vi.fn())).toEqual({})
  })

  it('清空全部写入空对象', () => {
    const dir = freshDir()
    let notes = saveNote(dir, {}, 'a', '1')
    notes = saveNote(dir, notes, 'b', '2')
    const cleared = clearNotes(dir)
    expect(cleared).toEqual({})
    expect(loadNotes(dir, vi.fn())).toEqual({})
  })

  it('损坏 JSON 警告并回退空表；ENOENT 静默', () => {
    const dir = freshDir()
    const warn = vi.fn()
    expect(loadNotes(join(dir, 'missing'), warn)).toEqual({})
    expect(warn).not.toHaveBeenCalled()
  })

  it('notesPath 拼接在数据目录下', () => {
    expect(notesPath('D:/data').split(/[\\/]/).pop()).toBe('notes.json')
  })
})
