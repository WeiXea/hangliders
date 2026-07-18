/** Skate Path solids — visuals and collision stay in sync. */

export type SkateCone = {
  id: number
  x: number
  z: number
  radius: number
  height: number
}

export type SkateBarrier = {
  id: number
  x: number
  z: number
  w: number
  d: number
  h: number
}

export type SkateRail = {
  id: number
  x: number
  z: number
  /** Length along Z */
  length: number
  height: number
}

export type SkateRamp = {
  id: number
  x: number
  z: number
  w: number
  d: number
  deckH: number
}

export type SkateBox = {
  id: number
  x: number
  z: number
  w: number
  d: number
  h: number
}

/** Path corridor: |x| < PATH_HALF_W, z in [PATH_Z0, PATH_Z1]. */
export const PATH_HALF_W = 7
export const PATH_Z0 = -8
export const PATH_Z1 = 420
export const PATH_DECK_Y = 2.05

/** Traffic cones — weave course. */
export const SKATE_CONES: SkateCone[] = [
  { id: 0, x: -2.2, z: 28, radius: 0.35, height: 0.95 },
  { id: 1, x: 2.4, z: 42, radius: 0.35, height: 0.95 },
  { id: 2, x: -3.1, z: 56, radius: 0.35, height: 0.95 },
  { id: 3, x: 1.8, z: 70, radius: 0.35, height: 0.95 },
  { id: 4, x: -1.5, z: 88, radius: 0.35, height: 0.95 },
  { id: 5, x: 3.2, z: 102, radius: 0.35, height: 0.95 },
  { id: 6, x: -2.8, z: 118, radius: 0.35, height: 0.95 },
  { id: 7, x: 2.0, z: 134, radius: 0.35, height: 0.95 },
  { id: 8, x: -3.4, z: 168, radius: 0.35, height: 0.95 },
  { id: 9, x: 2.6, z: 182, radius: 0.35, height: 0.95 },
  { id: 10, x: -1.2, z: 196, radius: 0.35, height: 0.95 },
  { id: 11, x: 3.0, z: 228, radius: 0.35, height: 0.95 },
  { id: 12, x: -2.5, z: 244, radius: 0.35, height: 0.95 },
  { id: 13, x: 1.4, z: 278, radius: 0.35, height: 0.95 },
  { id: 14, x: -3.0, z: 312, radius: 0.35, height: 0.95 },
  { id: 15, x: 2.2, z: 328, radius: 0.35, height: 0.95 },
  { id: 16, x: -1.8, z: 348, radius: 0.35, height: 0.95 },
  { id: 17, x: 2.8, z: 362, radius: 0.35, height: 0.95 },
]

/** Construction barriers — force left/right weaving. */
export const SKATE_BARRIERS: SkateBarrier[] = [
  { id: 0, x: 3.2, z: 48, w: 5.2, d: 0.55, h: 1.15 },
  { id: 1, x: -3.4, z: 96, w: 5.0, d: 0.55, h: 1.15 },
  { id: 2, x: 3.0, z: 156, w: 5.4, d: 0.55, h: 1.2 },
  { id: 3, x: -3.2, z: 214, w: 5.2, d: 0.55, h: 1.15 },
  { id: 4, x: 3.4, z: 268, w: 5.0, d: 0.55, h: 1.2 },
  { id: 5, x: -3.0, z: 334, w: 5.4, d: 0.55, h: 1.15 },
]

/** Low grind rails down the center lane. */
export const SKATE_RAILS: SkateRail[] = [
  { id: 0, x: 0, z: 78, length: 14, height: 0.55 },
  { id: 1, x: -1.5, z: 190, length: 18, height: 0.55 },
  { id: 2, x: 1.2, z: 290, length: 16, height: 0.6 },
]

/** Raised decks / funbox tops (walkable). */
export const SKATE_RAMPS: SkateRamp[] = [
  { id: 0, x: -3.5, z: 64, w: 5.5, d: 8, deckH: 1.4 },
  { id: 1, x: 0, z: 142, w: 8, d: 10, deckH: 1.8 },
  { id: 2, x: 3.2, z: 236, w: 5.2, d: 9, deckH: 1.5 },
  { id: 3, x: 0, z: 370, w: 9, d: 12, deckH: 2.0 },
]

/** Solid crates / blocks on or beside the path. */
export const SKATE_BOXES: SkateBox[] = [
  { id: 0, x: 4.5, z: 110, w: 2.2, d: 2.2, h: 1.4 },
  { id: 1, x: -4.6, z: 250, w: 2.4, d: 2.0, h: 1.5 },
  { id: 2, x: 4.2, z: 300, w: 2.0, d: 2.4, h: 1.3 },
]

export function sampleSkatepathSupport(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
): { y: number; onDeck: boolean } {
  const ground = getHeight(x, z)
  let best = ground
  let onDeck = false
  for (const p of SKATE_RAMPS) {
    const hx = p.w * 0.5
    const hz = p.d * 0.5
    if (x >= p.x - hx && x <= p.x + hx && z >= p.z - hz && z <= p.z + hz) {
      const deck = getHeight(p.x, p.z) + p.deckH
      if (deck > best) {
        best = deck
        onDeck = true
      }
    }
  }
  return { y: best, onDeck }
}

export function resolveSkatepathPush(
  pos: { x: number; y: number; z: number },
  getHeight: (x: number, z: number) => number,
  radius: number,
): { x: number; y: number; z: number } {
  let x = pos.x
  let z = pos.z
  const y = pos.y

  for (const c of SKATE_CONES) {
    const gy = getHeight(c.x, c.z)
    if (y > gy + c.height + 1.2) continue
    const dx = x - c.x
    const dz = z - c.z
    const dist = Math.hypot(dx, dz)
    const min = c.radius + radius
    if (dist < min && dist > 1e-4) {
      const n = min / dist
      x = c.x + dx * n
      z = c.z + dz * n
    } else if (dist < 1e-4) {
      x = c.x + min
    }
  }

  const boxes: { x: number; z: number; w: number; d: number; h: number }[] = [
    ...SKATE_BARRIERS,
    ...SKATE_BOXES,
    ...SKATE_RAILS.map((r) => ({
      x: r.x,
      z: r.z,
      w: 0.28,
      d: r.length,
      h: r.height,
    })),
  ]

  for (const b of boxes) {
    const gy = getHeight(b.x, b.z)
    if (y > gy + b.h + 1.0) continue
    const hx = b.w * 0.5 + radius
    const hz = b.d * 0.5 + radius
    const dx = x - b.x
    const dz = z - b.z
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const ox = hx - Math.abs(dx)
      const oz = hz - Math.abs(dz)
      if (ox < oz) x = b.x + Math.sign(dx || 1) * hx
      else z = b.z + Math.sign(dz || 1) * hz
    }
  }

  return { x, y, z }
}
