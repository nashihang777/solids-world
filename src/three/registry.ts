import { disposeModel, type BuildOptions, type EntryModel } from './kit'

const FAMILY_WHITELIST = new Set([
  'crystal-structure-',
  'lattice-bravais-',
  'orbital-',
  'bohr-atom-',
  'symmetry-elements-',
  'lattice-wave-',
])

const LRU_LIMIT = 12

type BuilderModule = { default: (options: BuildOptions) => EntryModel }

const modules = import.meta.glob(['./builders/*.ts', '!./builders/*.test.ts']) as Record<
  string,
  () => Promise<BuilderModule>
>

const cache = new Map<string, EntryModel>()

export function listBuilderIds(): string[] {
  return Object.keys(modules)
    .map((path) => path.slice(path.lastIndexOf('/') + 1, -3))
    .filter((id) => !FAMILY_WHITELIST.has(id))
    .sort()
}

export function hasBuilder(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(modules, `./builders/${id}.ts`)
}

export function resetModelTransform(model: EntryModel): void {
  model.group.scale.setScalar(1)
  model.group.rotation.set(0, 0, 0)
  model.group.updateMatrix()
}

export async function loadEntry(id: string, options: BuildOptions): Promise<EntryModel> {
  const orbitalKey = options.orbitalView
    ? `${options.orbitalView.isoFraction.toFixed(3)}|${options.orbitalView.pMode}`
    : ''
  const key = `${id}|${options.supercell}|${options.theme}|${options.bondTolerance}|${orbitalKey}`
  const cached = cache.get(key)
  if (cached) {
    cache.delete(key)
    cache.set(key, cached)
    resetModelTransform(cached)
    return cached
  }
  const loader = modules[`./builders/${id}.ts`]
  if (!loader) throw new Error(`未注册的条目 builder：${id}`)
  const started = performance.now()
  const mod = await loader()
  const model = mod.default(options)
  window.solids.log(
    'info',
    `perf entry-load:${id} supercell=${options.supercell} ${Math.round(performance.now() - started)}ms`,
  )
  cache.set(key, model)
  while (cache.size > LRU_LIMIT) {
    const oldest = cache.keys().next().value as string
    const evicted = cache.get(oldest) as EntryModel
    cache.delete(oldest)
    disposeModel(evicted)
    window.solids.log('info', `perf lru-evict:${oldest}`)
  }
  return model
}

export function cacheSize(): number {
  return cache.size
}
