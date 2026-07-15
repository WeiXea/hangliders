import { CITY_STREET_DECK } from './cityBuildings'
import { getBuildingById } from './cityBuildings'

/** Depth below street deck for tunnels / garages. */
export const UNDERGROUND_DEPTH = 4.2

export type InteriorTheme =
  | 'cafe'
  | 'bakery'
  | 'police'
  | 'bank'
  | 'pharmacy'
  | 'grocery'
  | 'barber'
  | 'diner'
  | 'fire'
  | 'hotel'
  | 'gym'
  | 'pizza'
  | 'bookstore'
  | 'sushi'
  | 'tailor'
  | 'flowers'
  | 'generic'

export function interiorThemeForShop(shop?: string): InteriorTheme {
  const s = (shop ?? '').toUpperCase()
  if (s.includes('CAFE') || s.includes('NOIR')) return 'cafe'
  if (s.includes('BAKERY')) return 'bakery'
  if (s.includes('POLICE')) return 'police'
  if (s.includes('BANK')) return 'bank'
  if (s.includes('PHARMACY')) return 'pharmacy'
  if (s.includes('GROCER')) return 'grocery'
  if (s.includes('BARBER')) return 'barber'
  if (s.includes('DINER')) return 'diner'
  if (s.includes('FIRE')) return 'fire'
  if (s.includes('HOTEL')) return 'hotel'
  if (s.includes('GYM')) return 'gym'
  if (s.includes('PIZZA')) return 'pizza'
  if (s.includes('BOOK')) return 'bookstore'
  if (s.includes('SUSHI')) return 'sushi'
  if (s.includes('TAILOR')) return 'tailor'
  if (s.includes('FLOWER')) return 'flowers'
  return 'generic'
}

export type CityGarage = {
  id: number
  x: number
  z: number
  width: number
  depth: number
  /** Bay opening faces +Z when yaw=0 */
  yaw: number
  label: string
}

export const CITY_GARAGES: CityGarage[] = [
  { id: 0, x: 22, z: 12, width: 10, depth: 8, yaw: 0, label: 'Central Garage' },
  { id: 1, x: 88, z: 108, width: 12, depth: 9, yaw: Math.PI / 2, label: 'Midtown Auto' },
  { id: 2, x: 168, z: 52, width: 11, depth: 8.5, yaw: 0, label: 'Harbor Garage' },
]

export type TunnelSegment = {
  id: number
  x: number
  z: number
  halfW: number
  halfD: number
  /** Street grate — press E to enter/exit */
  surfaceExit?: boolean
  /** Hidden alley access */
  secret?: boolean
  /** Linked enterable building basement */
  buildingLink?: number
  label?: string
}

/** Underground corridors + secret network under downtown. */
export const TUNNEL_SEGMENTS: TunnelSegment[] = [
  { id: 0, x: 44, z: 44, halfW: 3.2, halfD: 14, surfaceExit: true, label: 'Main Square Grate' },
  { id: 1, x: 44, z: 44, halfW: 14, halfD: 3.2, surfaceExit: true, label: 'Square Cross-Pass' },
  { id: 2, x: 55, z: 88, halfW: 3, halfD: 18, buildingLink: 11, label: 'Bank Vault Tunnel' },
  { id: 3, x: 0, z: 88, halfW: 28, halfD: 3, secret: true, label: 'Alley Catacombs' },
  { id: 4, x: -5, z: 100, halfW: 3, halfD: 12, buildingLink: 28, secret: true, label: 'Precinct Underpass' },
  { id: 5, x: 132, z: 44, halfW: 3.2, halfD: 16, buildingLink: 13, label: 'Tech Hub Conduit' },
  { id: 6, x: 132, z: 44, halfW: 16, halfD: 3.2, label: 'East Utility Main' },
  { id: 7, x: 132, z: 132, halfW: 3, halfD: 22, surfaceExit: true, label: 'Harbor Escape Grate' },
  { id: 8, x: 88, z: 132, halfW: 22, halfD: 3, secret: true, label: 'Smuggler Run' },
  { id: 9, x: 26, z: 132, halfW: 3, halfD: 14, buildingLink: 26, secret: true, label: 'Bakery Cellar Link' },
]

export type SecretPassage = {
  id: number
  /** Alley door world offset from building center */
  buildingId: number
  tunnelSegmentId: number
  doorOffsetX: number
  doorOffsetZ: number
}

export const SECRET_PASSAGES: SecretPassage[] = [
  { id: 0, buildingId: 11, tunnelSegmentId: 2, doorOffsetX: -2, doorOffsetZ: 0.5 },
  { id: 1, buildingId: 28, tunnelSegmentId: 4, doorOffsetX: 1.5, doorOffsetZ: -1 },
  { id: 2, buildingId: 13, tunnelSegmentId: 5, doorOffsetX: 0, doorOffsetZ: 2 },
  { id: 3, buildingId: 26, tunnelSegmentId: 9, doorOffsetX: -1.8, doorOffsetZ: 1.2 },
  { id: 4, buildingId: 0, tunnelSegmentId: 3, doorOffsetX: 2, doorOffsetZ: -2 },
]

export function undergroundFloorY(getHeight: (x: number, z: number) => number, x: number, z: number) {
  return getHeight(x, z) + CITY_STREET_DECK - UNDERGROUND_DEPTH
}

export function inTunnelCorridor(x: number, z: number): TunnelSegment | null {
  for (const seg of TUNNEL_SEGMENTS) {
    if (Math.abs(x - seg.x) <= seg.halfW && Math.abs(z - seg.z) <= seg.halfD) return seg
  }
  return null
}

export function nearestSurfaceTunnelEntrance(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
  range = 3.5,
): TunnelSegment | null {
  let best: TunnelSegment | null = null
  let bestD = range
  for (const seg of TUNNEL_SEGMENTS) {
    if (!seg.surfaceExit) continue
    const gy = getHeight(seg.x, seg.z) + CITY_STREET_DECK
    const d = Math.hypot(seg.x - x, seg.z - z)
    if (d < bestD) {
      bestD = d
      best = seg
    }
    void gy
  }
  return best
}

export function nearestSecretAlleyDoor(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
  range = 2.8,
): { passage: SecretPassage; segment: TunnelSegment } | null {
  let best: { passage: SecretPassage; segment: TunnelSegment; d: number } | null = null
  for (const p of SECRET_PASSAGES) {
    const b = getBuildingById(p.buildingId)
    const seg = TUNNEL_SEGMENTS.find((s) => s.id === p.tunnelSegmentId)
    if (!b || !seg) continue
    const doorX = b.x + p.doorOffsetX
    const doorZ = b.z + p.doorOffsetZ
    const d = Math.hypot(doorX - x, doorZ - z)
    if (d < range && (!best || d < best.d)) {
      best = { passage: p, segment: seg, d }
    }
    void getHeight
  }
  return best ? { passage: best.passage, segment: best.segment } : null
}

export function nearestGarageEntry(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
  range = 4.5,
): CityGarage | null {
  let best: CityGarage | null = null
  let bestD = range
  for (const g of CITY_GARAGES) {
    const mouthZ = g.z + (g.depth * 0.5 + 1.2) * Math.cos(g.yaw)
    const mouthX = g.x + (g.depth * 0.5 + 1.2) * Math.sin(g.yaw)
    const d = Math.hypot(mouthX - x, mouthZ - z)
    if (d < bestD) {
      bestD = d
      best = g
    }
    void getHeight
  }
  return best
}

export function clampInTunnel(
  x: number,
  z: number,
): { x: number; z: number; seg: TunnelSegment | null } {
  const seg = inTunnelCorridor(x, z)
  if (!seg) {
    // Nudge toward nearest segment center
    let best = TUNNEL_SEGMENTS[0]!
    let bestD = Infinity
    for (const s of TUNNEL_SEGMENTS) {
      const d = Math.hypot(s.x - x, s.z - z)
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    return {
      x: Math.max(best.x - best.halfW + 0.5, Math.min(best.x + best.halfW - 0.5, x)),
      z: Math.max(best.z - best.halfD + 0.5, Math.min(best.z + best.halfD - 0.5, z)),
      seg: best,
    }
  }
  return {
    x: Math.max(seg.x - seg.halfW + 0.5, Math.min(seg.x + seg.halfW - 0.5, x)),
    z: Math.max(seg.z - seg.halfD + 0.5, Math.min(seg.z + seg.halfD - 0.5, z)),
    seg,
  }
}

/** Sidewalk band beside roads (between curb and building line). */
export function onSidewalk(x: number, z: number): boolean {
  const step = 22
  const roadW = 11
  const sw = 2.8
  const modX = ((x % step) + step) % step
  const modZ = ((z % step) + step) % step
  const nearRoadX = modX < step * 0.5 ? modX : step - modX
  const nearRoadZ = modZ < step * 0.5 ? modZ : step - modZ
  const distToRoadCenterX = Math.abs(nearRoadX - step * 0.5)
  const distToRoadCenterZ = Math.abs(nearRoadZ - step * 0.5)
  const onHorizontalRoad = distToRoadCenterZ <= roadW * 0.5 + sw + 0.4 && distToRoadCenterZ > roadW * 0.5 + 0.15
  const onVerticalRoad = distToRoadCenterX <= roadW * 0.5 + sw + 0.4 && distToRoadCenterX > roadW * 0.5 + 0.15
  return onHorizontalRoad || onVerticalRoad
}

export function inGarageInterior(x: number, z: number, garageId: number): boolean {
  const g = CITY_GARAGES.find((gar) => gar.id === garageId)
  if (!g) return false
  const cos = Math.cos(g.yaw)
  const sin = Math.sin(g.yaw)
  const lx = (x - g.x) * cos + (z - g.z) * sin
  const lz = -(x - g.x) * sin + (z - g.z) * cos
  return Math.abs(lx) <= g.width * 0.45 && Math.abs(lz) <= g.depth * 0.45
}
