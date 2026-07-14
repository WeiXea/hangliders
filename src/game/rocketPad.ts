import { WALK_FEET } from '../types/game'
import { CITY_STREET_DECK } from './cityBuildings'

/** Starbase-style launch complex west of Skyline Municipal. */
export const ROCKET_PAD = {
  x: -158,
  z: 28,
  yaw: Math.PI / 2,
} as const

export const ROCKET_TOWER = {
  baseX: -178,
  baseZ: 28,
  /** Catwalk deck height above pad terrain */
  topY: 38,
  /** Elevator ride speed m/s */
  speed: 5,
} as const

export const ROCKET_HATCH = {
  x: ROCKET_PAD.x,
  z: ROCKET_PAD.z + 2,
} as const

export const MOON_LZ = { x: 0, z: 0 } as const

/** Scripted mission timing (seconds). Total ~2 min to lunar surface. */
export const ROCKET_TIMELINE = {
  countdown: 10,
  liftoff: 5,
  stage1Burn: 50,
  meco: 6,
  stage2Burn: 26,
  coast: 22,
  landingBurn: 14,
} as const

export function rocketPadDeckY(padGroundY: number) {
  return padGroundY + CITY_STREET_DECK
}

export function rocketCatwalkY(padGroundY: number) {
  return rocketPadDeckY(padGroundY) + ROCKET_TOWER.topY + WALK_FEET
}

export function nearRocketTowerBase(px: number, pz: number) {
  return Math.hypot(px - ROCKET_TOWER.baseX, pz - ROCKET_TOWER.baseZ) < 5
}

export function nearRocketHatch(px: number, py: number, pz: number, padGroundY: number) {
  const hatchY = rocketCatwalkY(padGroundY)
  return (
    Math.abs(py - hatchY) < 3.5 &&
    Math.hypot(px - ROCKET_HATCH.x, pz - ROCKET_HATCH.z) < 6
  )
}

/** Walkable launch-complex surfaces (tower deck + catwalk bridge). */
export function sampleRocketLaunchSupport(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
): number | null {
  const padGy = getHeight(ROCKET_PAD.x, ROCKET_PAD.z)
  const deckY = rocketPadDeckY(padGy)
  const walkY = rocketCatwalkY(padGy)

  // Tower platform
  if (
    Math.abs(x - ROCKET_TOWER.baseX) < 6 &&
    Math.abs(z - ROCKET_TOWER.baseZ) < 6
  ) {
    return walkY
  }

  // Catwalk bridge — tower to rocket
  const minX = ROCKET_TOWER.baseX - 2
  const maxX = ROCKET_PAD.x + 10
  if (x >= minX && x <= maxX && Math.abs(z - ROCKET_TOWER.baseZ) < 3.2) {
    return walkY
  }

  // Tower base at street level
  if (nearRocketTowerBase(x, z)) {
    return deckY + WALK_FEET
  }

  return null
}
