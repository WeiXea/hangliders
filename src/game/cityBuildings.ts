/** Shared city building defs — visuals and collision must stay in sync. */
export type CityBuilding = {
  x: number
  z: number
  width: number
  height: number
  color: string
  windows: boolean[]
}

export const CITY_BUILDINGS: CityBuilding[] = [
  { x: 10, width: 9, z: 25, height: 14, color: '#718096', windows: [true, false, true, true] },
  { x: 30, width: 11, z: 35, height: 22, color: '#4a5568', windows: [false, true, true, false] },
  { x: 50, width: 8, z: 20, height: 32, color: '#2d3748', windows: [true, true, false, true] },
  { x: 70, width: 10, z: 30, height: 18, color: '#718096', windows: [true, false, false, true] },
  { x: -10, width: 7, z: 40, height: 12, color: '#a0aec0', windows: [false, true, true, true] },
  { x: 15, width: 9, z: 55, height: 26, color: '#4a5568', windows: [true, true, true, false] },
  { x: 45, width: 7, z: 65, height: 16, color: '#718096', windows: [false, false, true, true] },
  { x: 65, width: 11, z: 80, height: 24, color: '#2d3748', windows: [true, true, true, true] },
  { x: 85, width: 8, z: 45, height: 20, color: '#a0aec0', windows: [true, false, true, false] },
  { x: 100, width: 12, z: 60, height: 28, color: '#4a5568', windows: [false, true, false, true] },
  { x: 5, width: 6, z: 75, height: 10, color: '#cbd5e0', windows: [true, true, false, false] },
  { x: 55, width: 9, z: 95, height: 15, color: '#718096', windows: [true, false, true, true] },
  { x: 120, width: 10, z: 90, height: 22, color: '#4a5568', windows: [true, true, false, true] },
  { x: 140, width: 8, z: 50, height: 18, color: '#718096', windows: [false, true, true, false] },
  { x: 160, width: 11, z: 110, height: 30, color: '#2d3748', windows: [true, false, true, true] },
  { x: 180, width: 9, z: 70, height: 16, color: '#a0aec0', windows: [true, true, true, false] },
  { x: 90, width: 7, z: 130, height: 12, color: '#cbd5e0', windows: [false, false, true, true] },
  { x: 110, width: 10, z: 150, height: 20, color: '#4a5568', windows: [true, true, false, false] },
]

export function buildingDepth(b: CityBuilding): number {
  return b.width * 0.85
}

/** Axis-aligned box hit vs glider/pilot position. */
export function hitBuildingBox(
  pos: { x: number; y: number; z: number },
  b: CityBuilding,
  groundY: number,
  margin = 0.55,
): boolean {
  const halfW = b.width * 0.5 + margin
  const halfD = buildingDepth(b) * 0.5 + margin
  if (Math.abs(pos.x - b.x) > halfW) return false
  if (Math.abs(pos.z - b.z) > halfD) return false
  const top = groundY + b.height
  // Feet/body near ground through rooftop
  return pos.y > groundY - 0.5 && pos.y < top + 1.4
}

/** Push a walking position out of the nearest overlapping building. */
export function resolveBuildingPush(
  pos: { x: number; y: number; z: number },
  getHeight: (x: number, z: number) => number,
  margin = 0.35,
): { x: number; z: number } {
  let x = pos.x
  let z = pos.z
  for (const b of CITY_BUILDINGS) {
    const gy = getHeight(b.x, b.z)
    if (!hitBuildingBox({ x, y: pos.y, z }, b, gy, margin)) continue
    const halfW = b.width * 0.5 + margin
    const halfD = buildingDepth(b) * 0.5 + margin
    const dx = x - b.x
    const dz = z - b.z
    const ox = halfW - Math.abs(dx)
    const oz = halfD - Math.abs(dz)
    if (ox < oz) {
      x = b.x + Math.sign(dx || 1) * halfW
    } else {
      z = b.z + Math.sign(dz || 1) * halfD
    }
  }
  return { x, z }
}
