import type { Biome, Vec3 } from '../types/game'

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
  { x: -80, z: 40, radius: 5, height: 32 },
  { x: -70, z: 90, radius: 4, height: 28 },
  { x: 140, z: 40, radius: 6, height: 36 },
  { x: 130, z: 110, radius: 5, height: 30 },
]

/** City buildings still block — but slightly tighter hitboxes */
export const CITY_OBSTACLES: Obstacle[] = [
  { x: 10, z: 25, radius: 4.2, height: 14 },
  { x: 30, z: 35, radius: 5, height: 22 },
  { x: 50, z: 20, radius: 4, height: 32 },
  { x: 70, z: 30, radius: 4.5, height: 18 },
  { x: -10, z: 40, radius: 3.5, height: 12 },
  { x: 15, z: 55, radius: 4.2, height: 26 },
  { x: 45, z: 65, radius: 3.5, height: 16 },
  { x: 65, z: 80, radius: 5, height: 24 },
  { x: 85, z: 45, radius: 4, height: 20 },
  { x: 100, z: 60, radius: 5.5, height: 28 },
  { x: 5, z: 75, radius: 3.2, height: 10 },
  { x: 55, z: 95, radius: 4.2, height: 15 },
]

export function getObstacles(biome: Biome): Obstacle[] {
  // Mountains: no crash pillars on the flight path
  if (biome === 'city') return CITY_OBSTACLES
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
  // Wide pass — almost anything through the opening counts
  if (radial < ring.radius - 0.2) return 'pass'
  // Only crash if squarely into the rim
  if (radial < ring.radius + tube && Math.abs(localZ) < 1.2) return 'crash'
  return 'none'
}
