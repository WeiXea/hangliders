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
  /** Catwalk platform height above pad deck */
  topY: 38,
  /** Elevator ride speed m/s */
  speed: 6,
} as const

export const ROCKET_HATCH = {
  x: ROCKET_PAD.x,
  z: ROCKET_PAD.z + 2,
  /** Height above pad deck to board */
  y: ROCKET_TOWER.topY - 0.5,
} as const

export const MOON_LZ = { x: 0, z: 0 } as const

export function rocketCatwalkY(padGroundY: number) {
  return padGroundY + CITY_STREET_DECK + ROCKET_TOWER.topY + WALK_FEET
}

export function nearRocketTowerBase(px: number, pz: number) {
  return Math.hypot(px - ROCKET_TOWER.baseX, pz - ROCKET_TOWER.baseZ) < 4.5
}

export function nearRocketHatch(px: number, py: number, pz: number, padGroundY: number) {
  const hatchY = rocketCatwalkY(padGroundY)
  return (
    Math.abs(py - hatchY) < 3 &&
    Math.hypot(px - ROCKET_HATCH.x, pz - ROCKET_HATCH.z) < 5
  )
}
