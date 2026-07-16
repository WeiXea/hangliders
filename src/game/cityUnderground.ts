import { CITY_STREET_DECK } from './cityBuildings'
import { buildingDepth, getBuildingById } from './cityBuildings'

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
  yaw: number
  label: string
}

/** Garages on major corners — visible from the street grid. */
export const CITY_GARAGES: CityGarage[] = [
  { id: 0, x: 22, z: 22, width: 14, depth: 10, yaw: 0, label: 'Central Garage' },
  { id: 1, x: 66, z: 88, width: 14, depth: 11, yaw: Math.PI / 2, label: 'Midtown Auto' },
  { id: 2, x: 132, z: 132, width: 14, depth: 10, yaw: 0, label: 'Harbor Garage' },
]

export type TunnelSegment = {
  id: number
  x: number
  z: number
  halfW: number
  halfD: number
  surfaceExit?: boolean
  secret?: boolean
  buildingLink?: number
  label?: string
}

/** Underground corridors under the 22 m street grid. */
export const TUNNEL_SEGMENTS: TunnelSegment[] = [
  { id: 0, x: 44, z: 44, halfW: 3.5, halfD: 15, surfaceExit: true, label: 'Main Square Metro' },
  { id: 1, x: 44, z: 44, halfW: 15, halfD: 3.5, surfaceExit: true, label: 'Main Square Metro' },
  { id: 2, x: 55, z: 88, halfW: 3.5, halfD: 20, buildingLink: 11, label: 'Bank Vault Tunnel' },
  { id: 3, x: 0, z: 88, halfW: 30, halfD: 3.5, secret: true, label: 'Alley Catacombs' },
  { id: 4, x: -5, z: 100, halfW: 3.5, halfD: 14, buildingLink: 28, secret: true, label: 'Precinct Underpass' },
  { id: 5, x: 132, z: 44, halfW: 3.5, halfD: 18, buildingLink: 13, label: 'Tech Hub Conduit' },
  { id: 6, x: 132, z: 44, halfW: 18, halfD: 3.5, label: 'East Utility Main' },
  { id: 7, x: 132, z: 132, halfW: 3.5, halfD: 24, surfaceExit: true, label: 'Harbor Metro' },
  { id: 8, x: 88, z: 132, halfW: 24, halfD: 3.5, secret: true, label: 'Smuggler Run' },
  { id: 9, x: 26, z: 132, halfW: 3.5, halfD: 16, buildingLink: 26, secret: true, label: 'Bakery Cellar Link' },
]

export type SecretPassage = {
  id: number
  buildingId: number
  tunnelSegmentId: number
}

export const SECRET_PASSAGES: SecretPassage[] = [
  { id: 0, buildingId: 11, tunnelSegmentId: 2 },
  { id: 1, buildingId: 28, tunnelSegmentId: 4 },
  { id: 2, buildingId: 13, tunnelSegmentId: 5 },
  { id: 3, buildingId: 26, tunnelSegmentId: 9 },
  { id: 4, buildingId: 0, tunnelSegmentId: 3 },
]

/** Surface markers for map + wayfinder (world x,z). */
export type CityLandmark = {
  id: string
  label: string
  hint: string
  x: number
  z: number
  kind: 'metro' | 'garage' | 'secret'
  color: string
}

function secretLandmarkPos(buildingId: number): { x: number; z: number } {
  const b = getBuildingById(buildingId)
  if (!b) return { x: 0, z: 0 }
  const d = buildingDepth(b)
  return { x: b.x - b.width * 0.5 - 0.65, z: b.z + d * 0.08 }
}

export const CITY_LANDMARKS: CityLandmark[] = [
  { id: 'metro-main', label: 'Main Square Metro', hint: 'Follow the cyan beacon — press E at the stairwell', x: 44, z: 44, kind: 'metro', color: '#4cc9f0' },
  { id: 'metro-harbor', label: 'Harbor Metro', hint: 'Cyan stairwell at the harbor intersection — press E', x: 132, z: 132, kind: 'metro', color: '#4cc9f0' },
  ...CITY_GARAGES.map((g) => {
    const mouth = garageEntryPos(g)
    return {
      id: `garage-${g.id}`,
      label: g.label,
      hint: 'Yellow parking arch with beacon — press E',
      x: mouth.x,
      z: mouth.z,
      kind: 'garage' as const,
      color: '#ffd60a',
    }
  }),
  ...([
    [11, 'Bank Alley Door', 'Purple door in the alley west of BANK'],
    [28, 'Precinct Alley Door', 'Purple door behind POLICE HQ'],
    [0, 'Cafe Alley Door', 'Purple door west of CAFE NOIR'],
    [13, 'Tech Hub Alley Door', 'Purple door west of TECH HUB'],
    [26, 'Bakery Alley Door', 'Purple door west of BAKERY'],
  ] as const).map(([buildingId, label, hint]) => {
    const pos = secretLandmarkPos(buildingId)
    return {
      id: `secret-${buildingId}`,
      label,
      hint: `${hint} — press E`,
      x: pos.x,
      z: pos.z,
      kind: 'secret' as const,
      color: '#b5179e',
    }
  }),
]

export function garageEntryPos(g: CityGarage) {
  return {
    x: g.x + Math.sin(g.yaw) * (g.depth * 0.5 + 2),
    z: g.z + Math.cos(g.yaw) * (g.depth * 0.5 + 2),
  }
}

export function secretDoorWorldPos(
  passage: SecretPassage,
  getHeight: (x: number, z: number) => number,
): { x: number; y: number; z: number } {
  const b = getBuildingById(passage.buildingId)
  if (!b) return { x: 0, y: 0, z: 0 }
  const d = buildingDepth(b)
  return {
    x: b.x - b.width * 0.5 - 0.65,
    y: getHeight(b.x, b.z) + CITY_STREET_DECK,
    z: b.z + d * 0.08,
  }
}

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
  _getHeight: (x: number, z: number) => number,
  range = 7,
): TunnelSegment | null {
  const seen = new Set<number>()
  let best: TunnelSegment | null = null
  let bestD = range
  for (const seg of TUNNEL_SEGMENTS) {
    if (!seg.surfaceExit || seen.has(seg.id)) continue
    seen.add(seg.id)
    const d = Math.hypot(seg.x - x, seg.z - z)
    if (d < bestD) {
      bestD = d
      best = seg
    }
  }
  return best
}

export function nearestSecretAlleyDoor(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
  range = 5.5,
): { passage: SecretPassage; segment: TunnelSegment; door: { x: number; y: number; z: number } } | null {
  let best: {
    passage: SecretPassage
    segment: TunnelSegment
    door: { x: number; y: number; z: number }
    d: number
  } | null = null
  for (const p of SECRET_PASSAGES) {
    const seg = TUNNEL_SEGMENTS.find((s) => s.id === p.tunnelSegmentId)
    if (!seg) continue
    const door = secretDoorWorldPos(p, getHeight)
    const d = Math.hypot(door.x - x, door.z - z)
    if (d < range && (!best || d < best.d)) {
      best = { passage: p, segment: seg, door, d }
    }
  }
  return best ? { passage: best.passage, segment: best.segment, door: best.door } : null
}

export function nearestGarageEntry(
  x: number,
  z: number,
  _getHeight: (x: number, z: number) => number,
  range = 7,
): CityGarage | null {
  let best: CityGarage | null = null
  let bestD = range
  for (const g of CITY_GARAGES) {
    const mouth = garageEntryPos(g)
    const d = Math.hypot(mouth.x - x, mouth.z - z)
    if (d < bestD) {
      bestD = d
      best = g
    }
  }
  return best
}

export function nearestCityLandmark(x: number, z: number, maxRange = 220): CityLandmark | null {
  let best: CityLandmark | null = null
  let bestD = maxRange
  for (const lm of CITY_LANDMARKS) {
    const d = Math.hypot(lm.x - x, lm.z - z)
    if (d < bestD) {
      bestD = d
      best = lm
    }
  }
  return best
}

export function clampInTunnel(x: number, z: number) {
  const seg = inTunnelCorridor(x, z)
  if (!seg) {
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
