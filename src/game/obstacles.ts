import type { Biome, Vec3 } from '../types/game'
import { buildingWallCrash } from './cityBuildings'

/** Vertical solid obstacle — cylinder standing on the ground */
export interface Obstacle {
  x: number
  z: number
  radius: number
  height: number
}

/** Axis-aligned box obstacle (world space, no rotation). */
export interface BoxObstacle {
  x: number
  z: number
  halfW: number
  halfD: number
  /** Bottom of box above terrain (usually 0) */
  y0: number
  height: number
}

/** Clearance from terrain to glider origin while flying (pilot hangs below). */
export const GROUND_CLEARANCE = 2.15

/** Origin height when glider rests on the ground (A-frame base tube ≈ local y −0.55). */
export const GLIDER_REST_CLEARANCE = 0.58

/** Rock pillars — now collidable */
export const MOUNTAIN_SCENERY: Obstacle[] = [
  { x: -140, z: 60, radius: 6, height: 38 },
  { x: -120, z: 160, radius: 5, height: 32 },
  { x: 260, z: 50, radius: 7, height: 42 },
  { x: 240, z: 200, radius: 5.5, height: 34 },
  { x: 300, z: 120, radius: 6, height: 36 },
  { x: -200, z: 220, radius: 5.5, height: 30 },
  { x: 380, z: 180, radius: 6.5, height: 40 },
  { x: 160, z: 280, radius: 5, height: 28 },
]

const MOUNTAIN_CABINS: BoxObstacle[] = [
  { x: 55, z: 70, halfW: 2.2, halfD: 1.8, y0: 0, height: 3.5 },
  { x: 160, z: 50, halfW: 2.2, halfD: 1.8, y0: 0, height: 3.5 },
  { x: 220, z: 160, halfW: 2.4, halfD: 2.0, y0: 0, height: 3.6 },
  { x: 90, z: 190, halfW: 2.0, halfD: 1.7, y0: 0, height: 3.4 },
]

/** Match BeachScene hut / cliff footprints */
const BEACH_HUTS: BoxObstacle[] = [
  { x: 20, z: 55, halfW: 1.8, halfD: 1.6, y0: 0, height: 3.2 },
  { x: -10, z: 70, halfW: 1.8, halfD: 1.6, y0: 0, height: 3.2 },
  { x: 55, z: 95, halfW: 1.8, halfD: 1.6, y0: 0, height: 3.2 },
  { x: 120, z: 130, halfW: 1.9, halfD: 1.7, y0: 0, height: 3.2 },
  { x: 180, z: 90, halfW: 1.8, halfD: 1.6, y0: 0, height: 3.2 },
]

/** Approximate cliff face volumes — thin sheets along the west edge (not solid plateaus). */
const BEACH_CLIFFS: BoxObstacle[] = [
  { x: -78, z: -10, halfW: 4, halfD: 28, y0: 0, height: 28 },
  { x: -72, z: 35, halfW: 3.5, halfD: 18, y0: 0, height: 20 },
  { x: -68, z: -40, halfW: 4.5, halfD: 22, y0: 0, height: 32 },
  { x: -92, z: 20, halfW: 4, halfD: 24, y0: 0, height: 22 },
]

export function getCylinderObstacles(biome: Biome): Obstacle[] {
  if (biome === 'mountains') return MOUNTAIN_SCENERY
  return []
}

export function getBoxObstacles(biome: Biome): BoxObstacle[] {
  if (biome === 'beach') return [...BEACH_HUTS, ...BEACH_CLIFFS]
  if (biome === 'mountains') return MOUNTAIN_CABINS
  return []
}

export function hitObstacle(
  pos: Vec3,
  obstacle: Obstacle,
  groundY: number,
): boolean {
  const dx = pos.x - obstacle.x
  const dz = pos.z - obstacle.z
  const horiz = Math.hypot(dx, dz)
  if (horiz > obstacle.radius + 0.6) return false
  const top = groundY + obstacle.height
  return pos.y > groundY - 1 && pos.y < top + 1.5
}

function hitBoxObstacle(
  pos: Vec3,
  box: BoxObstacle,
  groundY: number,
  margin = 0.45,
): boolean {
  if (Math.abs(pos.x - box.x) > box.halfW + margin) return false
  if (Math.abs(pos.z - box.z) > box.halfD + margin) return false
  const bottom = groundY + box.y0
  const top = bottom + box.height
  return pos.y > bottom - 0.5 && pos.y < top + 1.2
}

/** True if slamming into a building wall (roofs are landable). */
export function hitCityBuildings(
  pos: Vec3,
  getHeight: (x: number, z: number) => number,
  interiorId = -1,
): boolean {
  return buildingWallCrash(pos, getHeight, interiorId)
}

/** Flight crash vs biome props (huts, cliffs, pillars). */
export function hitWorldProps(
  biome: Biome,
  pos: Vec3,
  getHeight: (x: number, z: number) => number,
): boolean {
  for (const o of getCylinderObstacles(biome)) {
    const gy = getHeight(o.x, o.z)
    if (hitObstacle(pos, o, gy)) return true
  }
  for (const b of getBoxObstacles(biome)) {
    const gy = getHeight(b.x, b.z)
    if (hitBoxObstacle(pos, b, gy)) return true
  }
  return false
}

/** Push a walker out of solid props. */
export function resolvePropPush(
  biome: Biome,
  pos: { x: number; y: number; z: number },
  getHeight: (x: number, z: number) => number,
  radius = 0.4,
): { x: number; z: number } {
  let x = pos.x
  let z = pos.z

  for (const o of getCylinderObstacles(biome)) {
    const gy = getHeight(o.x, o.z)
    if (pos.y > gy + o.height + 0.3) continue
    const dx = x - o.x
    const dz = z - o.z
    const d = Math.hypot(dx, dz)
    const minD = o.radius + radius
    if (d < minD && d > 1e-4) {
      const s = minD / d
      x = o.x + dx * s
      z = o.z + dz * s
    } else if (d < minD) {
      x = o.x + minD
    }
  }

  for (const b of getBoxObstacles(biome)) {
    const gy = getHeight(b.x, b.z)
    if (pos.y > gy + b.y0 + b.height + 0.3) continue
    const hw = b.halfW + radius
    const hd = b.halfD + radius
    const dx = x - b.x
    const dz = z - b.z
    if (Math.abs(dx) > hw || Math.abs(dz) > hd) continue
    const ox = hw - Math.abs(dx)
    const oz = hd - Math.abs(dz)
    if (ox < oz) {
      x = b.x + Math.sign(dx || 1) * hw
    } else {
      z = b.z + Math.sign(dz || 1) * hd
    }
  }

  return { x, z }
}

/**
 * Vertical ring — generous pass window through the center.
 * Rim only crashes if you skim the tube closely.
 */
export function checkRingCollision(
  pos: Vec3,
  ring: { position: Vec3; radius: number },
  yaw: number,
): 'pass' | 'crash' | 'none' {
  const dx = pos.x - ring.position.x
  const dy = pos.y - ring.position.y
  const dz = pos.z - ring.position.z
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const localX = dx * cos - dz * sin
  const localZ = dx * sin + dz * cos
  const localY = dy
  const radial = Math.hypot(localX, localY)
  const tube = 0.55
  const depth = 4.5

  if (Math.abs(localZ) > depth) return 'none'
  if (radial < ring.radius - 0.2) return 'pass'
  if (radial < ring.radius + tube && Math.abs(localZ) < 1.2) return 'crash'
  return 'none'
}
