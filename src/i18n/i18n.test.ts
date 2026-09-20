import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { zh, type DictKey } from './zh'
import { en } from './en'

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/

describe('i18n 闸门（i18n.md 四）', () => {
  it('dictionary-parity：zh 与 en 键集合完全一致', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('no-hardcoded-cjk：en 字典不得残留 CJK 字符', () => {
    const offenders = Object.entries(en).filter(([, value]) => CJK.test(value))
    expect(offenders).toEqual([])
  })

  it('no-raw-keys：界面组件不得绕过字典硬编码 CJK（TopBar 语言切换按钮的中/EN 母语标签除外）', () => {
    const files = [
      'src/App.tsx',
      'src/components/TopBar.tsx',
      'src/components/LibraryPanel.tsx',
      'src/components/StagePanel.tsx',
      'src/components/DetailPanel.tsx',
      'src/components/LessonModal.tsx',
      'src/components/QuizModal.tsx',
      'src/components/GalleryModal.tsx',
      'src/components/NotesOverview.tsx',
      'src/components/HelpModal.tsx',
      'src/components/NoteEditor.tsx',
      'src/three/Stage.tsx',
    ]
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8')
      const matches = source.match(new RegExp(CJK.source, 'g')) ?? []
      const allowed = file === 'src/components/TopBar.tsx' ? matches.filter((ch) => ch !== '中') : matches
      expect(allowed, `${file} 残留 CJK：${[...new Set(allowed)].join('')}`).toEqual([])
    }
  })

  it('字典值非空且不含未替换占位参数', () => {
    for (const [key, value] of Object.entries(en) as Array<[DictKey, string]>) {
      expect(value.length, `en.${key}`).toBeGreaterThan(0)
      expect(zh[key].length, `zh.${key}`).toBeGreaterThan(0)
    }
  })
})
