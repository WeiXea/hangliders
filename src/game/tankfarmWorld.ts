/** Tank Farm solids — visuals and collision stay in sync. */

export type FarmTank = {
  id: number
  x: number
  z: number
  radius: number
  height: number
  color: string
}

export type FarmPlatform = {
  id: number
  x: number
  z: number
  w: number
  d: number
  /** Deck height above local ground */
  deckH: number
}

export type FarmBox = {
  id: number
  x: number
  z: number
  w: number
  d: number
  h: number
}

/**
 * Launch is ~(32, 58). Tanks sit in a ring around the player so the yard
 * fills the first view — not a distant sky photo.
 */
export const FARM_TANKS: FarmTank[] = [
  { id: 0, x: 18, z: 70, radius: 7, height: 15, color: '#8a8478' },
  { id: 1, x: 48, z: 68, radius: 6, height: 13, color: '#9a9080' },
  { id: 2, x: 32, z: 88, radius: 9, height: 20, color: '#6e6a60' },
  { id: 3, x: 8, z: 55, radius: 5.5, height: 12, color: '#7a756c' },
  { id: 4, x: 58, z: 52, radius: 5.8, height: 12, color: '#857f72' },
  { id: 5, x: 55, z: 95, radius: 8, height: 18, color: '#656158' },
  { id: 6, x: 10, z: 95, radius: 7.5, height: 16, color: '#736e66' },
  { id: 7, x: 75, z: 75, radius: 7, height: 17, color: '#78736b' },
  { id: 8, x: -5, z: 75, radius: 6.2, height: 14, color: '#5f5b54' },
  { id: 9, x: 40, z: 115, radius: 8.5, height: 19, color: '#6a655e' },
  { id: 10, x: 20, z: 115, radius: 6.5, height: 15, color: '#716c64' },
  { id: 11, x: 65, z: 110, radius: 7.2, height: 16, color: '#6d6860' },
]

export const FARM_PLATFORMS: FarmPlatform[] = [
  { id: 0, x: 32, z: 78, w: 16, d: 4.5, deckH: 5.5 },
  { id: 1, x: 48, z: 82, w: 14, d: 3.8, deckH: 6.2 },
  { id: 2, x: 22, z: 100, w: 12, d: 4, deckH: 4.8 },
]

export const FARM_BOXES: FarmBox[] = [
  { id: 0, x: 25, z: 50, w: 6, d: 5, h: 3.5 },
  { id: 1, x: 42, z: 48, w: 7, d: 4.5, h: 3 },
  { id: 2, x: 70, z: 58, w: 8, d: 6, h: 4 },
  { id: 3, x: 5, z: 62, w: 5, d: 8, h: 3.2 },
]

export function sampleTankfarmSupport(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
): { y: number; onDeck: boolean } {
  const ground = getHeight(x, z)
  let best = ground
  let onDeck = false
  for (const p of FARM_PLATFORMS) {
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

/** Push a point out of tank cylinders and shed boxes. */
export function resolveTankfarmPush(
  pos: { x: number; y: number; z: number },
  getHeight: (x: number, z: number) => number,
  radius: number,
): { x: number; y: number; z: number } {
  let x = pos.x
  let z = pos.z
  const y = pos.y

  for (const t of FARM_TANKS) {
    const gy = getHeight(t.x, t.z)
    if (y > gy + t.height + 1.5) continue
    const dx = x - t.x
    const dz = z - t.z
    const dist = Math.hypot(dx, dz)
    const min = t.radius + radius
    if (dist < min && dist > 1e-4) {
      const n = min / dist
      x = t.x + dx * n
      z = t.z + dz * n
    } else if (dist < 1e-4) {
      x = t.x + min
    }
  }

  for (const b of FARM_BOXES) {
    const gy = getHeight(b.x, b.z)
    if (y > gy + b.h + 1.2) continue
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
