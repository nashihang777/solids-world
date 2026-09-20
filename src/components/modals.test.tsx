import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LessonModal } from './LessonModal'
import { QuizModal } from './QuizModal'
import { NoteEditor, NOTE_DEBOUNCE_MS } from './NoteEditor'
import { LocaleProvider } from '../i18n/LocaleProvider'
import { buildAtlasFor } from '../data/atlas'
import type { AtlasEntry } from '../data/types'

const FOUND = buildAtlasFor('zh').find((entry) => entry.id === 'nacl')
if (!FOUND) throw new Error('nacl 条目缺失')
const NACL: AtlasEntry = FOUND

function renderZh(node: React.ReactElement) {
  return render(<LocaleProvider locale="zh">{node}</LocaleProvider>)
}

beforeEach(() => {
  window.solids = { log: vi.fn() } as unknown as Window['solids']
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('讲解步进派发（testing.md 3.4）', () => {
  it('打开即派发第一步（含 anchor 联动）', () => {
    const onStepChange = vi.fn()
    renderZh(<LessonModal entry={NACL} onClose={vi.fn()} onStepChange={onStepChange} onFinish={vi.fn()} onQuiz={vi.fn()} />)
    expect(onStepChange).toHaveBeenCalledWith(NACL.guide.lesson[0])
    expect(screen.getByText('步骤 1 / 4')).toBeTruthy()
    expect(screen.getByText('两套穿插的格子')).toBeTruthy()
  })

  it('下一步推进并派发新步骤；上一步禁用于首步', () => {
    const onStepChange = vi.fn()
    renderZh(<LessonModal entry={NACL} onClose={vi.fn()} onStepChange={onStepChange} onFinish={vi.fn()} onQuiz={vi.fn()} />)
    const prev = screen.getByText('上一步')
    expect(prev.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByText('下一步'))
    expect(onStepChange).toHaveBeenLastCalledWith(NACL.guide.lesson[1])
    expect(screen.getByText('步骤 2 / 4')).toBeTruthy()
  })

  it('走完全部步骤显示完成页并触发 onFinish', () => {
    const onFinish = vi.fn()
    renderZh(<LessonModal entry={NACL} onClose={vi.fn()} onStepChange={vi.fn()} onFinish={onFinish} onQuiz={vi.fn()} />)
    for (let i = 0; i < NACL.guide.lesson.length - 1; i += 1) {
      fireEvent.click(screen.getByText('下一步'))
    }
    fireEvent.click(screen.getByText('完成'))
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.getByText('讲解完成')).toBeTruthy()
  })
})

describe('测验判分（testing.md 3.4）', () => {
  it('答错：正确项高亮且显示错因解释', () => {
    const q = NACL.guide.quiz[0]
    if (!q) throw new Error('quiz 缺失')
    const wrongOption = (q.answer + 1) % 3
    renderZh(<QuizModal entry={NACL} onClose={vi.fn()} onFinish={vi.fn()} />)
    const options = screen.getAllByRole('button').filter((btn) => q.options.includes(btn.textContent?.replace(/^[ABC]/, '') ?? ''))
    fireEvent.click(options[wrongOption])
    expect(screen.getByText('回答错误')).toBeTruthy()
    expect(screen.getByText(`错因：${q.explain}`)).toBeTruthy()
  })

  it('两题全对：得分 2/2，onFinish(true) 仅触发一次', () => {
    const onFinish = vi.fn()
    renderZh(<QuizModal entry={NACL} onClose={vi.fn()} onFinish={onFinish} />)
    for (const q of NACL.guide.quiz) {
      const options = screen.getAllByRole('button').filter((btn) => q.options.includes(btn.textContent?.replace(/^[ABC]/, '') ?? ''))
      fireEvent.click(options[q.answer])
      fireEvent.click(screen.getByText(q === NACL.guide.quiz[0] ? '下一题' : '查看结果'))
    }
    expect(screen.getByText('得分 2 / 2')).toBeTruthy()
    expect(onFinish).toHaveBeenCalledWith(true)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('部分答错：onFinish(false)', () => {
    const onFinish = vi.fn()
    renderZh(<QuizModal entry={NACL} onClose={vi.fn()} onFinish={onFinish} />)
    const questions = NACL.guide.quiz
    questions.forEach((q, i) => {
      const options = screen.getAllByRole('button').filter((btn) => q.options.includes(btn.textContent?.replace(/^[ABC]/, '') ?? ''))
      fireEvent.click(options[(q.answer + 1) % 3])
      fireEvent.click(screen.getByText(i < questions.length - 1 ? '下一题' : '查看结果'))
    })
    expect(onFinish).toHaveBeenCalledWith(false)
  })
})

describe('笔记防抖保存（testing.md 3.4）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('300ms 内连续输入只保存最后一次', () => {
    const onSave = vi.fn()
    renderZh(<NoteEditor entryId="nacl" note={undefined} onSave={onSave} />)
    const editor = screen.getByRole('textbox')
    fireEvent.change(editor, { target: { value: '六' } })
    fireEvent.change(editor, { target: { value: '六配位' } })
    expect(onSave).not.toHaveBeenCalled()
    vi.advanceTimersByTime(NOTE_DEBOUNCE_MS)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('nacl', '六配位')
  })

  it('静默 300ms 后再次输入会再次保存', () => {
    const onSave = vi.fn()
    renderZh(<NoteEditor entryId="nacl" note={undefined} onSave={onSave} />)
    const editor = screen.getByRole('textbox')
    fireEvent.change(editor, { target: { value: '六' } })
    vi.advanceTimersByTime(NOTE_DEBOUNCE_MS)
    fireEvent.change(editor, { target: { value: '六配位' } })
    vi.advanceTimersByTime(NOTE_DEBOUNCE_MS)
    expect(onSave).toHaveBeenCalledTimes(2)
    expect(onSave).toHaveBeenLastCalledWith('nacl', '六配位')
  })
})
