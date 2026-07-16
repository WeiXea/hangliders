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

/** Garages on clear curb lots — open bay in, drive/walk out the same mouth. */
export const CITY_GARAGES: CityGarage[] = [
  { id: 0, x: 22, z: 12, width: 14, depth: 12, yaw: 0, label: 'Central Garage' },
  { id: 1, x: 88, z: 100, width: 14, depth: 12, yaw: Math.PI / 2, label: 'Midtown Auto' },
  { id: 2, x: 148, z: 148, width: 14, depth: 12, yaw: 0, label: 'Harbor Garage' },
]

/** Surface road underpasses — cars drive straight through (lit tube on the street). */
export type RoadTunnel = {
  id: number
  x: number
  z: number
  /** Travel axis: cars move along this world axis */
  axis: 'x' | 'z'
  length: number
  halfW: number
  label: string
}

export const ROAD_TUNNELS: RoadTunnel[] = [
  { id: 0, x: 44, z: 120, axis: 'z', length: 40, halfW: 5.8, label: 'Central Underpass' },
  { id: 1, x: 100, z: 66, axis: 'x', length: 44, halfW: 5.8, label: 'Midtown Underpass' },
]

export function inRoadTunnel(x: number, z: number): RoadTunnel | null {
  for (const t of ROAD_TUNNELS) {
    if (t.axis === 'z') {
      if (Math.abs(x - t.x) <= t.halfW && Math.abs(z - t.z) <= t.length * 0.5) return t
    } else if (Math.abs(z - t.z) <= t.halfW && Math.abs(x - t.x) <= t.length * 0.5) {
      return t
    }
  }
  return null
}

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

/**
 * Continuous underground grid under the 22 m streets.
 * NS spines (tall halfD) + EW spines (wide halfW) overlap at junctions so you can walk the whole network.
 */
export const TUNNEL_SEGMENTS: TunnelSegment[] = [
  // —— Main Square hub ——
  { id: 0, x: 44, z: 44, halfW: 4, halfD: 4, surfaceExit: true, label: 'Main Square Station' },
  { id: 1, x: 44, z: 66, halfW: 3.2, halfD: 28, label: 'North Avenue Tunnel' },
  { id: 2, x: 44, z: 22, halfW: 3.2, halfD: 18, label: 'South Avenue Tunnel' },
  { id: 3, x: 22, z: 44, halfW: 22, halfD: 3.2, label: 'West Cross Passage' },
  { id: 4, x: 88, z: 44, halfW: 46, halfD: 3.2, label: 'East Cross Passage' },

  // —— Midtown (bank / police / cafe links) ——
  { id: 5, x: 44, z: 88, halfW: 3.2, halfD: 8, label: 'Midtown Junction' },
  { id: 6, x: 20, z: 88, halfW: 30, halfD: 3.2, secret: true, label: 'Midtown Catacombs' },
  { id: 7, x: 54, z: 88, halfW: 8, halfD: 12, buildingLink: 11, label: 'Bank Basement Link' },
  { id: 8, x: -12, z: 94, halfW: 5, halfD: 14, buildingLink: 28, secret: true, label: 'Precinct Underpass' },
  { id: 9, x: 5, z: 30, halfW: 4, halfD: 8, buildingLink: 0, secret: true, label: 'Cafe Cellar' },
  { id: 19, x: 24, z: 30, halfW: 22, halfD: 3.2, secret: true, label: 'Cafe Approach' },

  // —— East / Tech Hub ——
  { id: 10, x: 132, z: 44, halfW: 3.2, halfD: 8, label: 'Tech Junction' },
  { id: 11, x: 132, z: 22, halfW: 3.2, halfD: 18, label: 'Tech South Spur' },
  { id: 12, x: 132, z: 66, halfW: 3.2, halfD: 22, label: 'Harbor Approach' },
  { id: 13, x: 148, z: 54, halfW: 12, halfD: 3.2, buildingLink: 13, label: 'Tech Hub Link' },

  // —— Harbor ——
  { id: 14, x: 132, z: 132, halfW: 4, halfD: 4, surfaceExit: true, label: 'Harbor Station' },
  { id: 15, x: 88, z: 132, halfW: 28, halfD: 3.2, secret: true, label: 'Harbor Run' },
  { id: 16, x: 132, z: 110, halfW: 3.2, halfD: 18, label: 'Harbor North Approach' },
  { id: 17, x: 164, z: 160, halfW: 3.2, halfD: 18, buildingLink: 26, secret: true, label: 'Bakery Cellar' },
  { id: 18, x: 148, z: 132, halfW: 18, halfD: 3.2, secret: true, label: 'Bakery Approach' },
]

export type SecretPassage = {
  id: number
  buildingId: number
  tunnelSegmentId: number
}

/** Secret doors drop you into a stub that already connects to the grid. */
export const SECRET_PASSAGES: SecretPassage[] = [
  { id: 0, buildingId: 11, tunnelSegmentId: 7 },
  { id: 1, buildingId: 28, tunnelSegmentId: 8 },
  { id: 2, buildingId: 13, tunnelSegmentId: 13 },
  { id: 3, buildingId: 26, tunnelSegmentId: 17 },
  { id: 4, buildingId: 0, tunnelSegmentId: 9 },
]

/** Surface markers for map + wayfinder (world x,z). */
export type CityLandmark = {
  id: string
  label: string
  hint: string
  x: number
  z: number
  kind: 'metro' | 'garage' | 'secret' | 'guide'
  color: string
  /** Lower = preferred when distances are similar. */
  priority: number
}

function secretLandmarkPos(buildingId: number): { x: number; z: number } {
  const b = getBuildingById(buildingId)
  if (!b) return { x: 0, z: 0 }
  const d = buildingDepth(b)
  return { x: b.x - b.width * 0.5 - 0.65, z: b.z + d * 0.08 }
}

export function garageEntryPos(g: CityGarage) {
  return {
    x: g.x + Math.sin(g.yaw) * (g.depth * 0.5 + 2),
    z: g.z + Math.cos(g.yaw) * (g.depth * 0.5 + 2),
  }
}

export const CITY_LANDMARKS: CityLandmark[] = [
  {
    id: 'guide-downtown',
    label: 'Downtown',
    hint: 'Walk toward the cyan metro station',
    x: 22,
    z: 18,
    kind: 'guide',
    color: '#e9ecef',
    priority: 0,
  },
  {
    id: 'road-tunnel-midtown',
    label: 'Midtown Underpass',
    hint: 'Lit road tunnel — drive straight through',
    x: 100,
    z: 66,
    kind: 'metro',
    color: '#ffd60a',
    priority: 1,
  },
  {
    id: 'metro-main',
    label: 'Main Square Station',
    hint: 'Cyan stair pavilion — press E',
    x: 44,
    z: 44,
    kind: 'metro',
    color: '#4cc9f0',
    priority: 1,
  },
  {
    id: 'garage-central',
    label: 'Central Garage',
    hint: 'Yellow parking bay — press E',
    x: garageEntryPos(CITY_GARAGES[0]!).x,
    z: garageEntryPos(CITY_GARAGES[0]!).z,
    kind: 'garage',
    color: '#ffd60a',
    priority: 2,
  },
  {
    id: 'road-tunnel-central',
    label: 'Central Underpass',
    hint: 'Lit road tunnel on Avenue 44 — drive through',
    x: 44,
    z: 120,
    kind: 'metro',
    color: '#ffd60a',
    priority: 2,
  },
  {
    id: 'metro-harbor',
    label: 'Harbor Station',
    hint: 'Cyan stair pavilion — press E',
    x: 132,
    z: 132,
    kind: 'metro',
    color: '#4cc9f0',
    priority: 3,
  },
  {
    id: 'garage-midtown',
    label: 'Midtown Auto',
    hint: 'Yellow parking bay — press E',
    x: garageEntryPos(CITY_GARAGES[1]!).x,
    z: garageEntryPos(CITY_GARAGES[1]!).z,
    kind: 'garage',
    color: '#ffd60a',
    priority: 4,
  },
  {
    id: 'garage-harbor',
    label: 'Harbor Garage',
    hint: 'Yellow parking bay — press E',
    x: garageEntryPos(CITY_GARAGES[2]!).x,
    z: garageEntryPos(CITY_GARAGES[2]!).z,
    kind: 'garage',
    color: '#ffd60a',
    priority: 5,
  },
  ...([
    [0, 'Cafe cellar door', 'Quiet door west of CAFE NOIR'],
    [11, 'Bank cellar door', 'Quiet door west of BANK'],
    [28, 'Precinct cellar door', 'Quiet door west of POLICE'],
    [13, 'Tech cellar door', 'Quiet door west of TECH HUB'],
    [26, 'Bakery cellar door', 'Quiet door west of BAKERY'],
  ] as const).map(([buildingId, label, hint], i) => {
    const pos = secretLandmarkPos(buildingId)
    return {
      id: `secret-${buildingId}`,
      label,
      hint: `${hint} — press E`,
      x: pos.x,
      z: pos.z,
      kind: 'secret' as const,
      color: '#b5179e',
      priority: 10 + i,
    }
  }),
]

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

/** Underground spawn at the alley door — stub segment sits under it. */
export function secretTunnelEntryPos(
  passage: SecretPassage,
  getHeight: (x: number, z: number) => number,
): { x: number; y: number; z: number; segment: TunnelSegment } | null {
  const seg = TUNNEL_SEGMENTS.find((s) => s.id === passage.tunnelSegmentId)
  if (!seg) return null
  const door = secretDoorWorldPos(passage, getHeight)
  const clamped = clampInTunnel(door.x, door.z, passage.tunnelSegmentId)
  return {
    x: clamped.x,
    z: clamped.z,
    y: undergroundFloorY(getHeight, clamped.x, clamped.z),
    segment: clamped.seg,
  }
}

export function undergroundFloorY(getHeight: (x: number, z: number) => number, x: number, z: number) {
  return getHeight(x, z) + CITY_STREET_DECK - UNDERGROUND_DEPTH
}

export function segmentContains(seg: TunnelSegment, x: number, z: number, pad = 0) {
  return Math.abs(x - seg.x) <= seg.halfW + pad && Math.abs(z - seg.z) <= seg.halfD + pad
}

export function inTunnelCorridor(x: number, z: number, preferId = -1): TunnelSegment | null {
  if (preferId >= 0) {
    const preferred = TUNNEL_SEGMENTS.find((s) => s.id === preferId)
    if (preferred && segmentContains(preferred, x, z)) return preferred
  }
  let best: TunnelSegment | null = null
  let bestArea = Infinity
  for (const seg of TUNNEL_SEGMENTS) {
    if (!segmentContains(seg, x, z)) continue
    const area = seg.halfW * seg.halfD
    if (area < bestArea) {
      bestArea = area
      best = seg
    }
  }
  return best
}

export function nearestSurfaceTunnelEntrance(
  x: number,
  z: number,
  _getHeight: (x: number, z: number) => number,
  range = 8,
): TunnelSegment | null {
  const seen = new Set<number>()
  let best: TunnelSegment | null = null
  let bestD = range
  for (const seg of TUNNEL_SEGMENTS) {
    if (!seg.surfaceExit || seen.has(seg.x * 1000 + seg.z)) continue
    seen.add(seg.x * 1000 + seg.z)
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

/** Prefer metros/garages over secret doors when exploring from afar. */
export function nearestCityLandmark(x: number, z: number, maxRange = 280): CityLandmark | null {
  let best: CityLandmark | null = null
  let bestScore = Infinity
  for (const lm of CITY_LANDMARKS) {
    if (lm.kind === 'secret') continue
    const d = Math.hypot(lm.x - x, lm.z - z)
    if (d > maxRange) continue
    const score = d + lm.priority * 8
    if (score < bestScore) {
      bestScore = score
      best = lm
    }
  }
  return best
}

function projectOntoSegment(seg: TunnelSegment, x: number, z: number) {
  return {
    x: Math.max(seg.x - seg.halfW + 0.45, Math.min(seg.x + seg.halfW - 0.45, x)),
    z: Math.max(seg.z - seg.halfD + 0.45, Math.min(seg.z + seg.halfD - 0.45, z)),
  }
}

/** Soft clamp onto the tunnel graph — never teleports to a distant segment center. */
export function clampInTunnel(x: number, z: number, preferId = -1) {
  const inside = inTunnelCorridor(x, z, preferId)
  if (inside) {
    const p = projectOntoSegment(inside, x, z)
    return { x: p.x, z: p.z, seg: inside }
  }

  let best = TUNNEL_SEGMENTS[0]!
  let bestD = Infinity
  let bestP = { x, z }
  for (const s of TUNNEL_SEGMENTS) {
    const p = projectOntoSegment(s, x, z)
    const d = Math.hypot(p.x - x, p.z - z)
    if (d < bestD) {
      bestD = d
      best = s
      bestP = p
    }
  }
  return { x: bestP.x, z: bestP.z, seg: best }
}

/** Nearby corridors for underground rendering (walkable network you can see). */
export function nearbyTunnelSegments(x: number, z: number, range = 55): TunnelSegment[] {
  return TUNNEL_SEGMENTS.filter((s) => {
    const dx = Math.max(Math.abs(x - s.x) - s.halfW, 0)
    const dz = Math.max(Math.abs(z - s.z) - s.halfD, 0)
    return Math.hypot(dx, dz) <= range
  })
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

/** Push walkers out of garage shells when on the street. */
export function resolveGaragePush(x: number, z: number, margin = 0.4): { x: number; z: number } {
  let nx = x
  let nz = z
  for (const g of CITY_GARAGES) {
    const cos = Math.cos(g.yaw)
    const sin = Math.sin(g.yaw)
    const lx = (nx - g.x) * cos + (nz - g.z) * sin
    const lz = -(nx - g.x) * sin + (nz - g.z) * cos
    const halfW = g.width * 0.5 + margin
    const halfD = g.depth * 0.5 + margin
    if (Math.abs(lx) > halfW || Math.abs(lz) > halfD) continue
    // Open bay on +local Z — allow entry from mouth
    const mouthOpen = lz > halfD - 2.4 && Math.abs(lx) < g.width * 0.38
    if (mouthOpen) continue
    const ox = halfW - Math.abs(lx)
    const oz = halfD - Math.abs(lz)
    let nlx = lx
    let nlz = lz
    if (ox < oz) nlx = Math.sign(lx || 1) * halfW
    else nlz = Math.sign(lz || 1) * halfD
    nx = g.x + nlx * cos - nlz * sin
    nz = g.z + nlx * sin + nlz * cos
  }
  return { x: nx, z: nz }
}
