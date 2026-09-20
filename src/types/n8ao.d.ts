declare module 'n8ao' {
  import type { Camera, Color, Scene } from 'three'
  import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js'

  export interface N8AOConfiguration {
    aoRadius: number
    distanceFalloff: number
    intensity: number
    halfRes: boolean
    gammaCorrection: boolean
    color: Color
  }

  export class N8AOPass extends Pass {
    constructor(scene: Scene, camera: Camera, width: number, height: number)
    configuration: N8AOConfiguration
    setSize(width: number, height: number): void
    dispose(): void
  }
}
