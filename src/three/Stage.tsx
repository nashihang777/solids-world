import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { N8AOPass } from 'n8ao'
import type { Hotspot, Tone } from '../data/types'
import type { StructureData } from '../../electron/cif/structure'
import type { EntryModel, StagePalette, StageEvent } from './kit'
import { loadEntry } from './registry'
import { setShellHighlight } from './builders/orbital-'
import { buildFromStructureData } from './customStructure'
import { pmark, pspan } from '../perf/perf'
import { useLocale } from '../i18n/LocaleProvider'

export interface StageProps {
  entryId: string
  entryName: string
  supercell: 1 | 2
  showBonds: boolean
  showLabels: boolean
  spin: boolean
  theme: 'dark' | 'light'
  postfx: boolean
  bondTolerance: number
  hotspots: Hotspot[]
  activeHotspotId: string | null
  onHotspotSelect: (hotspot: Hotspot) => void
  customStructure: StructureData | null
  onApi?: (api: StageApi) => void
  orbitalView?: { isoFraction: number; pMode: 'single' | 'triple' }
  orbitalOpacity?: number
  showNodalSurfaces?: boolean
  radialR?: number
  onStageEvent?: (event: StageEvent) => void
  standingLabels?: boolean
  symSpeed?: number
  clipAxis?: number
  animPlayback?: { playing: boolean; speed: number }
  animParams?: Record<string, number>
  animStepTick?: number
}

export interface StageApi {
  reset(): void
  focus(): void
  zoom(direction: number): void
}

interface StageCssValues {
  palette: StagePalette
  tones: Record<Tone, string>
}

function readStagePalette(): StagePalette {
  const styles = getComputedStyle(document.documentElement)
  return {
    muted: styles.getPropertyValue('--muted').trim(),
    ink: styles.getPropertyValue('--ink').trim(),
  }
}

function readToneColors(): Record<Tone, string> {
  const styles = getComputedStyle(document.documentElement)
  return {
    cyan: styles.getPropertyValue('--tone-cyan').trim(),
    jade: styles.getPropertyValue('--tone-jade').trim(),
    amber: styles.getPropertyValue('--tone-amber').trim(),
    violet: styles.getPropertyValue('--tone-violet').trim(),
  }
}

function useStageCssValues(theme: 'dark' | 'light'): StageCssValues {
  const [values, setValues] = useState<StageCssValues>(() => ({ palette: readStagePalette(), tones: readToneColors() }))
  useEffect(() => {
    queueMicrotask(() => setValues({ palette: readStagePalette(), tones: readToneColors() }))
  }, [theme])
  return values
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

interface Webgl2NoticeProps {
  children: ReactNode
}

export function Webgl2Notice({ children }: Webgl2NoticeProps) {
  return <div className="webgl2-notice">{children}</div>
}

function frameCamera(camera: THREE.PerspectiveCamera, aspect: number, radius: number): void {
  const vFov = THREE.MathUtils.degToRad(camera.fov)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  const minFov = Math.min(vFov, hFov)
  const dist = (radius / Math.tan(minFov / 2)) * 1.2
  const polar = Math.PI / 2 - THREE.MathUtils.degToRad(15)
  const az = THREE.MathUtils.degToRad(35)
  camera.position.set(
    dist * Math.sin(polar) * Math.sin(az),
    dist * Math.cos(polar),
    dist * Math.sin(polar) * Math.cos(az),
  )
  camera.near = Math.max(radius / 100, 0.01)
  camera.far = dist + radius * 4
  camera.updateProjectionMatrix()
}

function PostFx({ radius }: { radius: number }) {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef<EffectComposer | null>(null)

  useEffect(() => {
    const composer = new EffectComposer(gl)
    const ao = new N8AOPass(scene, camera, size.width, size.height)
    ao.configuration.halfRes = true
    ao.configuration.aoRadius = Math.max(radius * 0.35, 0.5)
    ao.configuration.intensity = 3
    composer.addPass(ao)
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.2, 0.3, 0.9)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    composerRef.current = composer
    return () => {
      composer.dispose()
      composerRef.current = null
    }
  }, [gl, scene, camera, size, radius])

  useFrame(() => {
    composerRef.current?.render()
  }, 1)
  return null
}

function shadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('stage:shadow-canvas-unavailable')
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.45)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

interface StructureLayerProps {
  model: EntryModel
  showBonds: boolean
  showLabels: boolean
  spin: boolean
  theme: 'dark' | 'light'
  hotspots: Hotspot[]
  tones: Record<Tone, string>
  activeHotspotId: string | null
  onHotspotSelect: (hotspot: Hotspot) => void
  onApi?: (api: StageApi) => void
  orbitalOpacity?: number
  showNodalSurfaces?: boolean
  radialR?: number
  onStageEvent?: (event: StageEvent) => void
  standingLabels?: boolean
  symSpeed?: number
  clipAxis?: number
  animPlayback?: { playing: boolean; speed: number }
  animParams?: Record<string, number>
  animStepTick?: number
}

function StructureLayer({
  model,
  showBonds,
  showLabels,
  spin,
  theme,
  hotspots,
  tones,
  activeHotspotId,
  onHotspotSelect,
  onApi,
  orbitalOpacity,
  showNodalSurfaces,
  radialR,
  onStageEvent,
  standingLabels,
  symSpeed,
  clipAxis,
  animPlayback,
  animParams,
  animStepTick,
}: StructureLayerProps) {
  const { camera, size, controls, invalidate, gl, raycaster } = useThree()
  const apiImpl = useRef<Pick<StageApi, 'reset' | 'focus' | 'zoom'>>({
    reset: () => {},
    focus: () => {},
    zoom: () => {},
  })
  const stableApi = useMemo<StageApi>(
    () => ({
      reset: () => apiImpl.current.reset(),
      focus: () => apiImpl.current.focus(),
      zoom: (direction: number) => apiImpl.current.zoom(direction),
    }),
    [],
  )
  useEffect(() => {
    onApi?.(stableApi)
  }, [onApi, stableApi])
  const wrapper = useRef<THREE.Group>(null)
  const spinSuspend = useRef(false)
  const suspendTimer = useRef<number | null>(null)
  const entrance = useRef(0)
  const ringRefs = useRef<Array<HTMLDivElement | null>>([])
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const focusAnchor = useRef<THREE.Object3D | null>(null)
  const focusAnim = useRef<null | {
    t: number
    duration: number
    fromPos: THREE.Vector3
    fromTarget: THREE.Vector3
    distance: number
  }>(null)

  useEffect(() => {
    if (wrapper.current) {
      wrapper.current.scale.setScalar(1)
      wrapper.current.rotation.set(0, 0, 0)
    }
    entrance.current = prefersReducedMotion() ? 1 : 0
    if (model.animation) invalidate()
  }, [model, invalidate])

  useEffect(() => {
    model.group.traverse((obj) => {
      if (obj.userData?.kind === 'orbital-surface') {
        const material = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial
        material.opacity = orbitalOpacity ?? 0.6
      }
    })
    invalidate()
  }, [model, orbitalOpacity, invalidate])

  useEffect(() => {
    model.group.traverse((obj) => {
      if (obj.userData?.kind === 'nodal-surface') obj.visible = showNodalSurfaces ?? true
    })
    invalidate()
  }, [model, showNodalSurfaces, invalidate])

  useEffect(() => {
    if (radialR === undefined) return
    setShellHighlight(model, radialR)
    invalidate()
  }, [model, radialR, invalidate])

  useEffect(() => {
    if (symSpeed === undefined || !model.setSymSpeed) return
    model.setSymSpeed(symSpeed)
  }, [model, symSpeed])

  useEffect(() => {
    if (!animPlayback || !model.setAnimPlayback) return
    model.setAnimPlayback(animPlayback.playing, animPlayback.speed)
    invalidate()
  }, [model, animPlayback, invalidate])

  useEffect(() => {
    if (!animParams || !model.setAnimParams) return
    model.setAnimParams(animParams)
    invalidate()
  }, [model, animParams, invalidate])

  useEffect(() => {
    if (animStepTick === undefined || !model.animStep) return
    model.animStep()
    invalidate()
  }, [animStepTick, model, invalidate])

  useEffect(() => {
    const normals: Array<[number, number, number]> = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    if (clipAxis !== undefined && clipAxis >= 1 && clipAxis <= 3) {
      gl.clippingPlanes = [new THREE.Plane(new THREE.Vector3(...normals[clipAxis - 1]).negate(), 0)]
    } else {
      gl.clippingPlanes = []
    }
    invalidate()
    return () => {
      gl.clippingPlanes = []
    }
  }, [gl, clipAxis, invalidate])

  useEffect(() => {
    if (!model.interact) return
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    const onPointerDown = (event: PointerEvent) => {
      downX = event.clientX
      downY = event.clientY
    }
    const onPointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 4) return
      const rect = dom.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObject(model.group, true)
      for (const hit of hits) {
        if (typeof hit.object.userData?.swInteract !== 'number') continue
        const kind = (hit.object.userData.swInteractKind as string | undefined) ?? 'bohr-level'
        const stageEvent = model.interact?.({ kind, value: hit.object.userData.swInteract })
        if (stageEvent) {
          onStageEvent?.(stageEvent)
        }
        invalidate()
        return
      }
    }
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointerup', onPointerUp)
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointerup', onPointerUp)
    }
  }, [model, camera, raycaster, gl, invalidate, onStageEvent])

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    frameCamera(camera as THREE.PerspectiveCamera, aspect, model.radius)
  }, [model, camera, size])

  useEffect(() => {
    model.group.traverse((obj) => {
      if (obj.userData?.kind === 'bond') obj.visible = showBonds
    })
  }, [model, showBonds])

  const atoms = useMemo(() => {
    const items: Array<{ element: string; position: THREE.Vector3 }> = []
    model.group.traverse((obj) => {
      if (obj.userData?.kind === 'atom' && !obj.userData.ghost) {
        const mesh = obj as THREE.Mesh
        items.push({ element: mesh.userData.element as string, position: mesh.position.clone().add(model.group.position) })
      }
    })
    return items
  }, [model])

  useEffect(() => {
    const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null
    if (!model || !activeHotspotId || !orbit) {
      focusAnim.current = null
      return
    }
    const hotspot = hotspots.find((h) => h.id === activeHotspotId)
    const anchor = hotspot ? model.anchors[hotspot.anchor] : undefined
    if (!anchor) {
      focusAnim.current = null
      return
    }
    focusAnim.current = {
      t: 0,
      duration: prefersReducedMotion() ? 0.001 : 0.6,
      fromPos: camera.position.clone(),
      fromTarget: orbit.target.clone(),
      distance: model.radius * 0.45,
    }
  }, [model, activeHotspotId, hotspots, camera, controls])

  useEffect(() => {
    apiImpl.current = {
      reset: () => {
        focusAnim.current = null
        const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null
        if (orbit) {
          orbit.target.set(0, 0, 0)
          orbit.update()
        }
        const aspect = size.width / Math.max(size.height, 1)
        frameCamera(camera as THREE.PerspectiveCamera, aspect, model.radius)
        invalidate()
      },
      focus: () => {
        const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null
        const hotspot = hotspots.find((h) => h.id === activeHotspotId)
        const anchor = hotspot ? model.anchors[hotspot.anchor] : undefined
        if (!orbit || !anchor) return
        focusAnim.current = {
          t: 0,
          duration: prefersReducedMotion() ? 0.001 : 0.6,
          fromPos: camera.position.clone(),
          fromTarget: orbit.target.clone(),
          distance: model.radius * 0.45,
        }
        invalidate()
      },
      zoom: (direction: number) => {
        const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null
        if (!orbit) return
        const offset = camera.position.clone().sub(orbit.target)
        const factor = direction > 0 ? 0.8 : 1.25
        const next = Math.min(Math.max(offset.length() * factor, model.radius * 0.2), model.radius * 6)
        offset.setLength(next)
        camera.position.copy(orbit.target).add(offset)
        orbit.update()
        invalidate()
      },
    }
  })

  useFrame((state, delta) => {
    const w = wrapper.current
    if (!w) return
    let busy = false
    if (entrance.current < 1) {
      entrance.current = Math.min(entrance.current + delta / 0.24, 1)
      const t = entrance.current
      const c1 = 1.70158
      const c3 = c1 + 1
      const back = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
      w.scale.setScalar(0.85 + 0.15 * back)
      busy = true
    }
    if (spin && !spinSuspend.current) {
      w.rotation.y += 0.14 * delta
      busy = true
    }

    if (model.animation?.(state.clock.elapsedTime, delta)) busy = true

    const camDir = camera.position.clone().normalize()
    hotspots.forEach((hotspot, index) => {
      const anchor = model.anchors[hotspot.anchor]
      const ring = ringRefs.current[index]
      const card = cardRefs.current[index]
      if (!anchor) return
      const facing = anchor.clone().normalize().dot(camDir)
      const vis = smoothstep(-0.05, 0.3, facing)
      if (ring) {
        ring.style.opacity = String(0.35 + vis * 0.65)
      }
      if (card) card.style.opacity = String(vis)
    })

    const anim = focusAnim.current
    if (anim && focusAnchor.current) {
      const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null
      if (orbit) {
        anim.t = Math.min(anim.t + delta / anim.duration, 1)
        const e = anim.t < 0.5 ? 2 * anim.t * anim.t : 1 - Math.pow(-2 * anim.t + 2, 2) / 2
        const target = focusAnchor.current.getWorldPosition(new THREE.Vector3())
        const dir = camera.position.clone().sub(target).normalize()
        const toPos = target.clone().addScaledVector(dir, anim.distance)
        camera.position.lerpVectors(anim.fromPos, toPos, e)
        orbit.target.lerpVectors(anim.fromTarget, target, e)
        orbit.update()
        busy = true
        if (anim.t >= 1) focusAnim.current = null
      }
    }
    if (busy) state.invalidate()
  })

  return (
    <>
      <group ref={wrapper}>
        <primitive object={model.group} />
        <object3D
          ref={(obj: THREE.Object3D | null) => {
            focusAnchor.current = obj
            if (obj && activeHotspotId) {
              const hotspot = hotspots.find((h) => h.id === activeHotspotId)
              const anchor = hotspot ? model.anchors[hotspot.anchor] : undefined
              if (anchor) obj.position.copy(anchor)
            }
          }}
        />
        {showLabels &&
          atoms.map((atom, index) => (
            <Html key={`${atom.element}-${index}`} position={atom.position} center zIndexRange={[20, 10]}>
              <div className={`atom-label${theme === 'light' ? ' light' : ''}`}>{atom.element}</div>
            </Html>
          ))}
        {hotspots.map((hotspot, index) => {
          const anchor = model.anchors[hotspot.anchor]
          if (!anchor) return null
          const active = hotspot.id === activeHotspotId
          return (
            <group key={hotspot.id} position={anchor}>
              <mesh
                onClick={(event) => {
                  event.stopPropagation()
                  onHotspotSelect(hotspot)
                }}
              >
                <sphereGeometry args={[model.radius * 0.02, 12, 10]} />
                <meshBasicMaterial color={tones[hotspot.tone]} toneMapped={false} />
              </mesh>
              <Html center>
                <div className="hotspot-ring-wrap">
                  <div
                    ref={(el) => {
                      ringRefs.current[index] = el
                    }}
                    className={`hotspot-ring tone-${hotspot.tone}${active ? ' active' : ''}`}
                    onClick={() => onHotspotSelect(hotspot)}
                  >
                    <span className="hotspot-ring-core" />
                  </div>
                  {standingLabels && (
                    <span className="hotspot-ring-label">{hotspot.label}</span>
                  )}
                </div>
              </Html>
              {active && (
                <Html>
                  <div
                    ref={(el) => {
                      cardRefs.current[index] = el
                    }}
                    className="hotspot-stage-card"
                  >
                    <span className={`hotspot-stage-card-label tone-${hotspot.tone}`}>{hotspot.label}</span>
                    <p>{hotspot.note}</p>
                  </div>
                </Html>
              )}
            </group>
          )
        })}
      </group>
      <mesh position={[0, -model.radius * 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[model.radius * 2.6, model.radius * 2.6]} />
        <meshBasicMaterial map={shadowTexture()} transparent depthWrite={false} opacity={0.3} color="#000000" toneMapped={false} />
      </mesh>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={model.radius * 0.2}
        maxDistance={model.radius * 6}
        onStart={() => {
          spinSuspend.current = true
          if (suspendTimer.current !== null) window.clearTimeout(suspendTimer.current)
        }}
        onEnd={() => {
          suspendTimer.current = window.setTimeout(() => {
            spinSuspend.current = false
          }, 3000)
        }}
      />
    </>
  )
}

function FpsProbe() {
  const frames = useRef(0)
  const last = useRef(performance.now())

  useFrame(() => {
    frames.current += 1
    const now = performance.now()
    if (now - last.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - last.current))
      window.__swFps = fps
      frames.current = 0
      last.current = now
    }
  })
  return null
}

interface SceneContentProps {
  model: EntryModel | null
  cssValues: StageCssValues
  theme: 'dark' | 'light'
  showBonds: boolean
  showLabels: boolean
  spin: boolean
  postfx: boolean
  hotspots: Hotspot[]
  activeHotspotId: string | null
  onHotspotSelect: (hotspot: Hotspot) => void
  onApi?: (api: StageApi) => void
  orbitalOpacity?: number
  showNodalSurfaces?: boolean
  radialR?: number
  onStageEvent?: (event: StageEvent) => void
  standingLabels?: boolean
  symSpeed?: number
  clipAxis?: number
  animPlayback?: { playing: boolean; speed: number }
  animParams?: Record<string, number>
  animStepTick?: number
}

function SceneContent({
  model,
  cssValues,
  theme,
  showBonds,
  showLabels,
  spin,
  postfx,
  hotspots,
  activeHotspotId,
  onHotspotSelect,
  onApi,
  orbitalOpacity,
  showNodalSurfaces,
  radialR,
  onStageEvent,
  standingLabels,
  symSpeed,
  clipAxis,
  animPlayback,
  animParams,
  animStepTick,
}: SceneContentProps) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />
      <directionalLight position={[-6, -4, -6]} intensity={0.15} />
      {model && (
        <StructureLayer
          model={model}
          showBonds={showBonds}
          showLabels={showLabels}
          spin={spin}
          theme={theme}
          hotspots={hotspots}
          tones={cssValues.tones}
          activeHotspotId={activeHotspotId}
          onHotspotSelect={onHotspotSelect}
          onApi={onApi}
          orbitalOpacity={orbitalOpacity}
          showNodalSurfaces={showNodalSurfaces}
          radialR={radialR}
          onStageEvent={onStageEvent}
          standingLabels={standingLabels}
          symSpeed={symSpeed}
          clipAxis={clipAxis}
          animPlayback={animPlayback}
          animParams={animParams}
          animStepTick={animStepTick}
        />
      )}
      {postfx && model && <PostFx radius={model.radius} />}
      {import.meta.env.DEV && <FpsProbe />}
    </>
  )
}

function FpsBadge() {
  const [fps, setFps] = useState<number | null>(null)
  useEffect(() => {
    const id = window.setInterval(() => setFps(window.__swFps ?? null), 500)
    return () => window.clearInterval(id)
  }, [])
  return <div className="fps-badge">fps {fps === null ? '--' : fps}</div>
}

export function Stage(props: StageProps) {
  const { t } = useLocale()
  const webgl2 = useMemo(hasWebGL2, [])
  const cssValues = useStageCssValues(props.theme)
  const [model, setModel] = useState<EntryModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4
  const dpr: [number, number] = useMemo(
    () => (props.postfx ? (cores >= 8 ? [1, 2] : [1, 1.75]) : [1, 1.5]),
    [props.postfx, cores],
  )

  useEffect(() => {
    let alive = true
    pmark('entry-switch')
    const buildOptions = {
      supercell: props.supercell,
      theme: props.theme,
      bondTolerance: props.bondTolerance,
      palette: cssValues.palette,
      orbitalView: props.orbitalView,
    }
    const load: Promise<EntryModel> = props.customStructure
      ? Promise.resolve().then(() => buildFromStructureData(props.customStructure as StructureData, buildOptions))
      : loadEntry(props.entryId, buildOptions)
    void load.then(
      (loaded) => {
        if (!alive || loaded === model) return
        setModel(loaded)
        setError(null)
        window.solids.log('info', `perf entry-switch:${props.customStructure ? props.customStructure.fileName : props.entryId} ${Math.round(pspan('entry-switch'))}ms`)
      },
      (err: unknown) => {
        if (!alive) return
        setError(String(err))
      },
    )
    return () => {
      alive = false
    }
  }, [props.entryId, props.supercell, props.theme, props.bondTolerance, cssValues.palette, props.customStructure, props.orbitalView])

  if (!webgl2) {
    return (
      <Webgl2Notice>
        <h2>{t('stage.webgl2.title')}</h2>
        <p>{t('stage.webgl2.body1')}</p>
        <p>{t('stage.webgl2.body2')}</p>
      </Webgl2Notice>
    )
  }

  if (error !== null) {
    return (
      <div className="stage-error" role="alert">
        <h3>{t('stage.error.title')}</h3>
        <p className="stage-error-module">{props.entryId}</p>
        <p className="stage-error-reason">{error}</p>
      </div>
    )
  }

  return (
    <div className="stage-root">
      <Canvas
        frameloop="demand"
        dpr={dpr}
        camera={{ fov: 40, near: 0.1, far: 1000, position: [8, 6, 10] }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        <SceneContent
          model={model}
          cssValues={cssValues}
          theme={props.theme}
          showBonds={props.showBonds}
          showLabels={props.showLabels}
          spin={props.spin}
          postfx={props.postfx}
          hotspots={props.hotspots}
          activeHotspotId={props.activeHotspotId}
          onHotspotSelect={props.onHotspotSelect}
          onApi={props.onApi}
          orbitalOpacity={props.orbitalOpacity}
          showNodalSurfaces={props.showNodalSurfaces}
          radialR={props.radialR}
          onStageEvent={props.onStageEvent}
          standingLabels={props.standingLabels}
          symSpeed={props.symSpeed}
          clipAxis={props.clipAxis}
          animPlayback={props.animPlayback}
          animParams={props.animParams}
          animStepTick={props.animStepTick}
        />
      </Canvas>
      {model === null && (
        <div className="stage-loading" aria-label={t('stage.loading')}>
          <span className="stage-loading-name">{props.entryName}</span>
        </div>
      )}
      {import.meta.env.DEV && <FpsBadge />}
    </div>
  )
}
