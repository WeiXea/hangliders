import type { Biome, FlightState, Vec3 } from '../types/game'

export type BiomeGate = {
  from: Biome
  to: Biome
  label: string
  /** True when the jet should cross into `to` */
  test: (p: Vec3, alt: number) => boolean
  /** Spawn pose in the destination biome */
  spawn: { x: number; z: number; yaw: number; alt: number }
}

/**
 * Meta layout (not to scale):
 *   mountains (north)
 *        |
 * beach — city — (ocean east of city unused)
 */
export const BIOME_GATES: BiomeGate[] = [
  {
    from: 'city',
    to: 'beach',
    label: 'Coastal Cliffs',
    test: (p, alt) => p.x < -480 && alt > 55,
    spawn: { x: 180, z: 40, yaw: -Math.PI / 2, alt: 90 },
  },
  {
    from: 'city',
    to: 'mountains',
    label: 'Alpine Ridge',
    test: (p, alt) => p.z < -420 && alt > 55,
    spawn: { x: 40, z: 160, yaw: 0, alt: 110 },
  },
  {
    from: 'beach',
    to: 'city',
    label: 'Urban Skyline',
    test: (p, alt) => p.x > 850 && alt > 55,
    spawn: { x: -200, z: 40, yaw: Math.PI / 2, alt: 90 },
  },
  {
    from: 'beach',
    to: 'mountains',
    label: 'Alpine Ridge',
    test: (p, alt) => p.z < -900 && alt > 70,
    spawn: { x: -80, z: 120, yaw: 0.2, alt: 120 },
  },
  {
    from: 'mountains',
    to: 'city',
    label: 'Urban Skyline',
    test: (p, alt) => p.z > 900 && alt > 55,
    spawn: { x: 80, z: -80, yaw: Math.PI, alt: 95 },
  },
  {
    from: 'mountains',
    to: 'beach',
    label: 'Coastal Cliffs',
    test: (p, alt) => p.x < -900 && alt > 70,
    spawn: { x: 120, z: -40, yaw: -Math.PI / 2, alt: 100 },
  },
]

export function checkBiomeGate(
  biome: Biome,
  flight: FlightState,
): BiomeGate | null {
  if (flight.phase !== 'jet') return null
  if (flight.altitude < 50) return null
  for (const g of BIOME_GATES) {
    if (g.from !== biome) continue
    if (g.test(flight.position, flight.altitude)) return g
  }
  return null
}

/** Region cards for the world map (fixed schematic layout). */
export const MAP_REGIONS: {
  id: Biome
  label: string
  x: number
  y: number
  w: number
  h: number
  color: string
}[] = [
  { id: 'mountains', label: 'Mountains', x: 28, y: 6, w: 44, h: 28, color: '#6c757d' },
  { id: 'beach', label: 'Beach', x: 6, y: 38, w: 34, h: 40, color: '#4cc9f0' },
  { id: 'city', label: 'City', x: 48, y: 38, w: 46, h: 40, color: '#e9c46a' },
]

export const MAP_POIS: {
  biome: Biome
  label: string
  /** 0–100 within region card */
  u: number
  v: number
}[] = [
  { biome: 'city', label: 'Airport', u: 18, v: 42 },
  { biome: 'city', label: 'Downtown', u: 55, v: 48 },
  { biome: 'beach', label: 'Launch', u: 40, v: 55 },
  { biome: 'mountains', label: 'Peaks', u: 50, v: 40 },
]
