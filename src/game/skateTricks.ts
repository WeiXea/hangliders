import type { SkateState, SkateTrick, Vec3 } from '../types/game'
import { SKATE_RAILS, type SkateRail } from './skatepathWorld'

export type { SkateState, SkateTrick }

export const INITIAL_SKATE: SkateState = {
  trick: 'none',
  trickT: 0,
  crouch: 0,
  boardSpinX: 0,
  boardSpinY: 0,
  boardSpinZ: 0,
  grindRailId: -1,
  combo: 0,
  comboTimer: 0,
  score: 0,
  lastTrick: '',
  trickFlash: 0,
  bailT: 0,
}

export const TRICK_POINTS: Record<string, number> = {
  Ollie: 50,
  Kickflip: 200,
  Heelflip: 200,
  Shuvit: 150,
  '360 Flip': 400,
  Manual: 80,
  'Nose Manual': 90,
  '50-50 Grind': 250,
  Boardslide: 280,
}

const FLIP_DURATION = 0.52
const OLLIE_DURATION = 0.38

/** Edge detect for ollie release (module-scoped). */
let jumpHeldPrev = false

export function resetSkateInputEdge() {
  jumpHeldPrev = false
}

export function consumeOllieRelease(jumpHeld: boolean): boolean {
  const released = jumpHeldPrev && !jumpHeld
  jumpHeldPrev = jumpHeld
  return released
}

export function trickLabel(trick: SkateTrick): string {
  switch (trick) {
    case 'ollie':
      return 'Ollie'
    case 'kickflip':
      return 'Kickflip'
    case 'heelflip':
      return 'Heelflip'
    case 'shuvit':
      return 'Shuvit'
    case 'treflip':
      return '360 Flip'
    case 'manual':
      return 'Manual'
    case 'noseManual':
      return 'Nose Manual'
    case 'grind':
      return '50-50 Grind'
    case 'bail':
      return 'Bail!'
    default:
      return ''
  }
}

export function isFlipTrick(trick: SkateTrick): boolean {
  return (
    trick === 'kickflip' ||
    trick === 'heelflip' ||
    trick === 'shuvit' ||
    trick === 'treflip'
  )
}

export function flipComplete(skate: SkateState): boolean {
  if (skate.trick === 'ollie') return skate.trickT >= OLLIE_DURATION * 0.65
  if (isFlipTrick(skate.trick)) return skate.trickT >= FLIP_DURATION * 0.88
  return true
}

export function startTrick(skate: SkateState, trick: SkateTrick): SkateState {
  return {
    ...skate,
    trick,
    trickT: 0,
    boardSpinX: 0,
    boardSpinY: 0,
    boardSpinZ: 0,
    lastTrick: trickLabel(trick),
    trickFlash: 1.4,
  }
}

export function awardTrick(skate: SkateState, name: string): SkateState {
  const base = TRICK_POINTS[name] ?? 100
  const combo = skate.combo + 1
  const mult = 1 + Math.min(4, combo - 1) * 0.35
  const gain = Math.round(base * mult)
  return {
    ...skate,
    combo,
    comboTimer: 3.2,
    score: skate.score + gain,
    lastTrick: name,
    trickFlash: 1.6,
  }
}

/** Animate board spins for the active trick. */
export function tickBoardAnim(skate: SkateState, dt: number): SkateState {
  const t = skate.trickT + dt
  let { boardSpinX, boardSpinY, boardSpinZ } = skate

  if (skate.trick === 'ollie') {
    const u = Math.min(1, t / OLLIE_DURATION)
    boardSpinX = Math.sin(u * Math.PI) * 0.55
    boardSpinY = 0
    boardSpinZ = 0
  } else if (skate.trick === 'kickflip') {
    const u = Math.min(1, t / FLIP_DURATION)
    boardSpinZ = u * Math.PI * 2
    boardSpinX = Math.sin(u * Math.PI) * 0.35
  } else if (skate.trick === 'heelflip') {
    const u = Math.min(1, t / FLIP_DURATION)
    boardSpinZ = -u * Math.PI * 2
    boardSpinX = Math.sin(u * Math.PI) * 0.35
  } else if (skate.trick === 'shuvit') {
    const u = Math.min(1, t / FLIP_DURATION)
    boardSpinY = u * Math.PI
    boardSpinX = Math.sin(u * Math.PI) * 0.2
  } else if (skate.trick === 'treflip') {
    const u = Math.min(1, t / (FLIP_DURATION + 0.12))
    boardSpinY = u * Math.PI * 2
    boardSpinZ = u * Math.PI * 2
    boardSpinX = Math.sin(u * Math.PI) * 0.25
  } else if (skate.trick === 'manual') {
    boardSpinX = -0.42
    boardSpinY = 0
    boardSpinZ = 0
  } else if (skate.trick === 'noseManual') {
    boardSpinX = 0.48
    boardSpinY = 0
    boardSpinZ = 0
  } else if (skate.trick === 'grind') {
    boardSpinX = 0.08
    boardSpinZ = Math.sin(t * 14) * 0.04
  } else if (skate.trick === 'bail') {
    boardSpinX += dt * 4
    boardSpinZ += dt * 6
  } else {
    boardSpinX *= Math.exp(-10 * dt)
    boardSpinY *= Math.exp(-10 * dt)
    boardSpinZ *= Math.exp(-10 * dt)
    if (Math.abs(boardSpinX) < 0.01) boardSpinX = 0
    if (Math.abs(boardSpinY) < 0.01) boardSpinY = 0
    if (Math.abs(boardSpinZ) < 0.01) boardSpinZ = 0
  }

  let trickFlash = Math.max(0, skate.trickFlash - dt)
  let comboTimer = skate.comboTimer
  let combo = skate.combo
  if (combo > 0) {
    comboTimer -= dt
    if (comboTimer <= 0) {
      combo = 0
      comboTimer = 0
    }
  }

  return {
    ...skate,
    trickT: t,
    boardSpinX,
    boardSpinY,
    boardSpinZ,
    trickFlash,
    combo,
    comboTimer,
  }
}

export function findGrindRail(
  pos: Vec3,
  getHeight: (x: number, z: number) => number,
  maxDist = 0.55,
): { rail: SkateRail; topY: number } | null {
  let best: { rail: SkateRail; topY: number; d: number } | null = null
  for (const rail of SKATE_RAILS) {
    const hx = maxDist
    const hz = rail.length * 0.5 + 0.35
    if (Math.abs(pos.x - rail.x) > hx || Math.abs(pos.z - rail.z) > hz) continue
    const topY = getHeight(rail.x, rail.z) + rail.height + 0.06
    const d = Math.abs(pos.x - rail.x) + Math.abs(pos.y - topY) * 0.5
    if (pos.y > topY + 0.85 || pos.y < topY - 0.55) continue
    if (!best || d < best.d) best = { rail, topY, d }
  }
  return best ? { rail: best.rail, topY: best.topY } : null
}

export function alongRail(rail: SkateRail, z: number): number {
  const half = rail.length * 0.5
  return Math.max(rail.z - half, Math.min(rail.z + half, z))
}

export function railEnded(rail: SkateRail, z: number): boolean {
  const half = rail.length * 0.5
  return z <= rail.z - half + 0.15 || z >= rail.z + half - 0.15
}
