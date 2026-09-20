import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StagePanel } from './StagePanel'
import { LocaleProvider } from '../i18n/LocaleProvider'
import { buildAtlasFor } from '../data/atlas'
import type { AtlasEntry } from '../data/types'

const ATLAS = buildAtlasFor('zh')
const FOUND = ATLAS.find((entry) => entry.id === 'nacl')
if (!FOUND) throw new Error('nacl 条目缺失')
const NACL: AtlasEntry = FOUND

function makeDynamicsEntry(): AtlasEntry {
  return { ...NACL, id: 'sound-wave', field: 'dynamics', name: '声学波' }
}

const BASE_PROPS = {
  theme: 'dark' as const,
  postfx: false,
  bondTolerance: 1.15,
  supercell: 1 as const,
  showBonds: true,
  showLabels: false,
  spin: false,
  activeHotspotId: null,
  onHotspotSelect: vi.fn(),
  onToggleSupercell: vi.fn(),
  onToggleBonds: vi.fn(),
  onToggleLabels: vi.fn(),
  onToggleSpin: vi.fn(),
  onReset: vi.fn(),
  onRandom: vi.fn(),
  onStageApi: vi.fn(),
  customStructure: null,
  orbitalControls: { isoFraction: 0.2, pMode: 'single' as const, opacity: 0.6, showNodal: true, radialR: 1 },
  onOrbitalChange: vi.fn(),
  onStageEvent: vi.fn(),
  showAtomicLabels: true,
  onToggleAtomicLabels: vi.fn(),
  clipAxis: 0,
  onCycleClip: vi.fn(),
  symSpeed: 1,
  onSymSpeedChange: vi.fn(),
  animPlaying: true,
  animSpeed: 1,
  animParams: {},
  animStepTick: 0,
  onToggleAnimPlay: vi.fn(),
  onAnimSpeedChange: vi.fn(),
  onAnimParamChange: vi.fn(),
  onAnimStep: vi.fn(),
}

beforeEach(() => {
  window.solids = { log: vi.fn() } as unknown as Window['solids']
})

afterEach(() => {
  cleanup()
})

describe('工具条按钮随条目类型显隐（testing.md 3.4）', () => {
  it('晶体类条目显示超胞/键/标签按钮', () => {
    render(
      <LocaleProvider locale="zh">
        <StagePanel entry={NACL} {...BASE_PROPS} />
      </LocaleProvider>,
    )
    expect(screen.getByText('超胞 1×1×1')).toBeTruthy()
    expect(screen.getByText('键')).toBeTruthy()
    expect(screen.getByText('标签')).toBeTruthy()
    expect(screen.getByText('自转')).toBeTruthy()
    expect(screen.getByText('复位')).toBeTruthy()
  })

  it('动态类条目隐藏晶体专属按钮但保留标注点标签开关（隐藏而非置灰）', () => {
    render(
      <LocaleProvider locale="zh">
        <StagePanel entry={makeDynamicsEntry()} {...BASE_PROPS} />
      </LocaleProvider>,
    )
    expect(screen.queryByText(/超胞/)).toBeNull()
    expect(screen.queryByText('键')).toBeNull()
    expect(screen.getByText('标签')).toBeTruthy()
    expect(screen.getByText('自转')).toBeTruthy()
  })

  it('非晶体条目均有标注点标签开关（所有板块统一）', () => {
    const dyn = ATLAS.find((entry) => entry.id === 'wave-1d-mono')
    if (!dyn) throw new Error('wave-1d-mono 条目缺失')
    const atomic = ATLAS.find((entry) => entry.id === 'orbital-1s')
    if (!atomic) throw new Error('orbital-1s 条目缺失')
    const symmetry = ATLAS.find((entry) => entry.id === 'sym-rotation')
    if (!symmetry) throw new Error('sym-rotation 条目缺失')
    for (const entry of [dyn, atomic, symmetry]) {
      const { unmount } = render(
        <LocaleProvider locale="zh">
          <StagePanel entry={entry} {...BASE_PROPS} />
        </LocaleProvider>,
      )
      const labelButtons = screen.getAllByText('标签')
      expect(labelButtons.length, `${entry.id} 标签开关`).toBe(1)
      unmount()
    }
  })
})
