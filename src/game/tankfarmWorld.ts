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

/** Launch ~(32, 58). Dense ring so the first view is full of tanks. */
export const FARM_TANKS: FarmTank[] = [
  { id: 0, x: 18, z: 68, radius: 6.5, height: 14, color: '#c8c0b4' },
  { id: 1, x: 46, z: 66, radius: 5.5, height: 12, color: '#d0c8ba' },
  { id: 2, x: 32, z: 86, radius: 8, height: 18, color: '#b8b0a4' },
  { id: 3, x: 10, z: 54, radius: 5, height: 11, color: '#c4bcb0' },
  { id: 4, x: 54, z: 50, radius: 5.2, height: 11, color: '#cac2b4' },
  { id: 5, x: 52, z: 92, radius: 7, height: 16, color: '#a8a094' },
  { id: 6, x: 12, z: 92, radius: 6.5, height: 15, color: '#b0a898' },
  { id: 7, x: 70, z: 72, radius: 6.5, height: 15, color: '#b8b2a6' },
  { id: 8, x: -2, z: 72, radius: 5.8, height: 13, color: '#a0988c' },
  { id: 9, x: 38, z: 110, radius: 7.5, height: 17, color: '#aea690' },
  { id: 10, x: 22, z: 110, radius: 6, height: 14, color: '#b4ac9e' },
  { id: 11, x: 32, z: 72, radius: 5.5, height: 22, color: '#d2cab8' },
]

export const FARM_PLATFORMS: FarmPlatform[] = [
  { id: 0, x: 32, z: 78, w: 16, d: 4.5, deckH: 5.5 },
  { id: 1, x: 46, z: 80, w: 14, d: 3.8, deckH: 6.2 },
  { id: 2, x: 22, z: 98, w: 12, d: 4, deckH: 4.8 },
]

export const FARM_BOXES: FarmBox[] = [
  { id: 0, x: 26, z: 48, w: 6, d: 5, h: 3.5 },
  { id: 1, x: 40, z: 46, w: 7, d: 4.5, h: 3 },
  { id: 2, x: 68, z: 56, w: 8, d: 6, h: 4 },
  { id: 3, x: 6, z: 60, w: 5, d: 8, h: 3.2 },
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
