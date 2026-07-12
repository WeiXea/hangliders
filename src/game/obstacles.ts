import type { Biome, Vec3 } from '../types/game'
import { buildingWallCrash } from './cityBuildings'

/** Vertical solid obstacle — cylinder standing on the ground */
export interface Obstacle {
  x: number
  z: number
  radius: number
  height: number
}

/** Clearance from terrain to glider origin so pilot feet sit on the ground */
export const GROUND_CLEARANCE = 2.15

/** Decorative rock pillars only — kept far from the challenge ring path, no collision */
export const MOUNTAIN_SCENERY: Obstacle[] = [
  { x: -140, z: 60, radius: 6, height: 38 },
  { x: -120, z: 160, radius: 5, height: 32 },
  { x: 260, z: 50, radius: 7, height: 42 },
  { x: 240, z: 200, radius: 5.5, height: 34 },
  { x: 300, z: 120, radius: 6, height: 36 },
]

export function getObstacles(biome: Biome): Obstacle[] {
  if (biome === 'city') return []
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

/** True if slamming into a building wall (roofs are landable). */
export function hitCityBuildings(
  pos: Vec3,
  getHeight: (x: number, z: number) => number,
  interiorId = -1,
): boolean {
  return buildingWallCrash(pos, getHeight, interiorId)
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
