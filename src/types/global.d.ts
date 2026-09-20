import type { SolidsApi } from '../../electron/preload'

export interface PerfChannel {
  pmark(name: string): void
  pspan(name: string): number
}

declare global {
  interface Window {
    solids: SolidsApi
    __swPerf?: PerfChannel
    __swFps?: number
  }
}

export {}
