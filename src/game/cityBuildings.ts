/** Shared city building defs — visuals and collision must stay in sync. */
export type CityBuilding = {
  id: number
  x: number
  z: number
  width: number
  height: number
  color: string
  windows: boolean[]
  /** Soft-land / walk on roof (parachute, freefall, walk) */
  roofLandable: boolean
  /** Ground-floor doorway you can enter while walking */
  enterable: boolean
  /** Optional storefront label */
  shop?: string
  shopColor?: string
}

function win(pattern: boolean[]): boolean[] {
  return pattern
}

export const CITY_BUILDINGS: CityBuilding[] = [
  // Downtown core
  { id: 0, x: 10, width: 9, z: 25, height: 14, color: '#718096', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'CAFE NOIR', shopColor: '#c1272d' },
  { id: 1, x: 30, width: 11, z: 35, height: 22, color: '#4a5568', windows: win([false, true, true, false]), roofLandable: true, enterable: false },
  { id: 2, x: 50, width: 8, z: 20, height: 32, color: '#2d3748', windows: win([true, true, false, true]), roofLandable: true, enterable: false },
  { id: 3, x: 70, width: 10, z: 30, height: 18, color: '#718096', windows: win([true, false, false, true]), roofLandable: true, enterable: true, shop: 'BOOK NOOK', shopColor: '#2a9d8f' },
  { id: 4, x: -10, width: 7, z: 40, height: 12, color: '#a0aec0', windows: win([false, true, true, true]), roofLandable: true, enterable: true, shop: 'PIZZA+', shopColor: '#e9c46a' },
  { id: 5, x: 15, width: 9, z: 55, height: 26, color: '#4a5568', windows: win([true, true, true, false]), roofLandable: true, enterable: false },
  { id: 6, x: 45, width: 7, z: 65, height: 16, color: '#718096', windows: win([false, false, true, true]), roofLandable: true, enterable: true, shop: 'PHARMACY', shopColor: '#52b788' },
  { id: 7, x: 65, width: 11, z: 80, height: 24, color: '#2d3748', windows: win([true, true, true, true]), roofLandable: true, enterable: false },
  { id: 8, x: 85, width: 8, z: 45, height: 20, color: '#a0aec0', windows: win([true, false, true, false]), roofLandable: true, enterable: true, shop: 'GROCER', shopColor: '#457b9d' },
  { id: 9, x: 100, width: 12, z: 60, height: 28, color: '#4a5568', windows: win([false, true, false, true]), roofLandable: true, enterable: false },
  { id: 10, x: 5, width: 6, z: 75, height: 10, color: '#cbd5e0', windows: win([true, true, false, false]), roofLandable: true, enterable: true, shop: 'BARBER', shopColor: '#e76f51' },
  { id: 11, x: 55, width: 9, z: 95, height: 15, color: '#718096', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'BANK', shopColor: '#264653' },
  { id: 12, x: 120, width: 10, z: 90, height: 22, color: '#4a5568', windows: win([true, true, false, true]), roofLandable: true, enterable: false },
  { id: 13, x: 140, width: 8, z: 50, height: 18, color: '#718096', windows: win([false, true, true, false]), roofLandable: true, enterable: true, shop: 'TECH HUB', shopColor: '#7b2cbf' },
  { id: 14, x: 160, width: 11, z: 110, height: 30, color: '#2d3748', windows: win([true, false, true, true]), roofLandable: true, enterable: false },
  { id: 15, x: 180, width: 9, z: 70, height: 16, color: '#a0aec0', windows: win([true, true, true, false]), roofLandable: true, enterable: true, shop: 'FLOWERS', shopColor: '#f72585' },
  { id: 16, x: 90, width: 7, z: 130, height: 12, color: '#cbd5e0', windows: win([false, false, true, true]), roofLandable: true, enterable: true, shop: 'SUSHI', shopColor: '#ff6b6b' },
  { id: 17, x: 110, width: 10, z: 150, height: 20, color: '#4a5568', windows: win([true, true, false, false]), roofLandable: true, enterable: false },
  // Midtown expansion
  { id: 18, x: -30, width: 8, z: 20, height: 18, color: '#5a6a7a', windows: win([true, true, false, true]), roofLandable: true, enterable: true, shop: 'HOTEL', shopColor: '#c9a227' },
  { id: 19, x: -25, width: 10, z: 60, height: 22, color: '#3d4f5f', windows: win([false, true, true, true]), roofLandable: true, enterable: false },
  { id: 20, x: 35, width: 7, z: 110, height: 14, color: '#8a9aab', windows: win([true, false, true, false]), roofLandable: true, enterable: true, shop: 'GYM', shopColor: '#00b4d8' },
  { id: 21, x: 75, width: 9, z: 160, height: 26, color: '#2d3748', windows: win([true, true, true, false]), roofLandable: true, enterable: false },
  { id: 22, x: 130, width: 8, z: 130, height: 19, color: '#718096', windows: win([false, true, false, true]), roofLandable: true, enterable: true, shop: 'RADIO', shopColor: '#ff9f1c' },
  { id: 23, x: 200, width: 12, z: 100, height: 34, color: '#1a202c', windows: win([true, true, true, true]), roofLandable: true, enterable: false },
  { id: 24, x: 210, width: 8, z: 140, height: 16, color: '#a0aec0', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'DINER', shopColor: '#e63946' },
  { id: 25, x: 25, width: 10, z: 140, height: 21, color: '#4a5568', windows: win([false, true, true, false]), roofLandable: true, enterable: false },
  { id: 26, x: 155, width: 7, z: 170, height: 13, color: '#cbd5e0', windows: win([true, true, false, true]), roofLandable: true, enterable: true, shop: 'BAKERY', shopColor: '#f4a261' },
  { id: 27, x: 175, width: 9, z: 40, height: 27, color: '#2d3748', windows: win([true, false, true, false]), roofLandable: true, enterable: false },
  { id: 28, x: -5, width: 8, z: 100, height: 15, color: '#718096', windows: win([true, true, true, false]), roofLandable: true, enterable: true, shop: 'POLICE', shopColor: '#1d3557' },
  { id: 29, x: 40, width: 11, z: 180, height: 29, color: '#3d4f5f', windows: win([false, true, false, true]), roofLandable: true, enterable: false },
  { id: 30, x: 220, width: 10, z: 60, height: 20, color: '#5a6a7a', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'FIRE CO.', shopColor: '#d62828' },
  { id: 31, x: 95, width: 8, z: 20, height: 17, color: '#a0aec0', windows: win([true, true, false, false]), roofLandable: true, enterable: true, shop: 'TAILOR', shopColor: '#9b5de5' },
]

/** Rooftop launch pads — random pick on each city start. */
export type CityLaunchPad = {
  id: number
  buildingId: number
  label: string
  yaw: number
}

export const CITY_LAUNCH_PADS: CityLaunchPad[] = [
  { id: 0, buildingId: 2, label: 'Apex Tower Helipad', yaw: Math.PI * 0.08 },
  { id: 1, buildingId: 14, label: 'Harbor Heights Deck', yaw: Math.PI * 0.15 },
  { id: 2, buildingId: 23, label: 'Skyline Spire Pad', yaw: -Math.PI * 0.05 },
]

export function pickCityLaunchPad(): CityLaunchPad {
  return CITY_LAUNCH_PADS[Math.floor(Math.random() * CITY_LAUNCH_PADS.length)]!
}

export function buildingDepth(b: CityBuilding): number {
  return b.width * 0.85
}

export function buildingRoofY(
  b: CityBuilding,
  getHeight: (x: number, z: number) => number,
): number {
  return getHeight(b.x, b.z) + b.height
}

export function horizInBuilding(
  x: number,
  z: number,
  b: CityBuilding,
  margin = 0,
): boolean {
  const halfW = b.width * 0.5 + margin
  const halfD = buildingDepth(b) * 0.5 + margin
  return Math.abs(x - b.x) <= halfW && Math.abs(z - b.z) <= halfD
}

/** Terrain or rooftop under (x,z) — for landing / walking. */
export function sampleCitySupport(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
): { y: number; buildingId: number; onRoof: boolean } {
  const terrain = getHeight(x, z)
  let best = terrain
  let buildingId = -1
  for (const b of CITY_BUILDINGS) {
    if (!b.roofLandable) continue
    if (!horizInBuilding(x, z, b, -0.15)) continue
    const roof = buildingRoofY(b, getHeight)
    if (roof > best + 0.5) {
      best = roof
      buildingId = b.id
    }
  }
  return {
    y: best,
    buildingId,
    onRoof: buildingId >= 0 && best > terrain + 1,
  }
}

export function getBuildingById(id: number): CityBuilding | null {
  return CITY_BUILDINGS.find((b) => b.id === id) ?? null
}

/** Door is on the +Z face center of enterable buildings. */
export function doorWorldPos(
  b: CityBuilding,
  getHeight: (x: number, z: number) => number,
): { x: number; y: number; z: number } {
  const d = buildingDepth(b)
  return {
    x: b.x,
    y: getHeight(b.x, b.z) + 1.1,
    z: b.z + d * 0.5 + 0.4,
  }
}

export function nearestEnterableDoor(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
  range = 3.2,
): CityBuilding | null {
  let best: CityBuilding | null = null
  let bestD = range
  for (const b of CITY_BUILDINGS) {
    if (!b.enterable) continue
    const door = doorWorldPos(b, getHeight)
    const d = Math.hypot(door.x - x, door.z - z)
    if (d < bestD) {
      bestD = d
      best = b
    }
  }
  return best
}

/** Solid wall hit (not roof deck, not street). */
export function buildingWallCrash(
  pos: { x: number; y: number; z: number },
  getHeight: (x: number, z: number) => number,
  interiorId: number,
): boolean {
  for (const b of CITY_BUILDINGS) {
    if (interiorId === b.id) continue
    const gy = getHeight(b.x, b.z)
    const roof = gy + b.height
    // Slightly generous footprint so wingtip scrapes count
    if (!horizInBuilding(pos.x, pos.z, b, 0.65)) continue
    // Roof deck / launch clearance — don't smash into the top floors
    if (pos.y >= roof - 0.9) continue
    // Street-level doorways / sidewalks
    if (pos.y <= gy + 1.15) continue
    return true
  }
  return false
}

/** Axis-aligned box hit vs glider/pilot position (legacy full volume). */
export function hitBuildingBox(
  pos: { x: number; y: number; z: number },
  b: CityBuilding,
  groundY: number,
  margin = 0.55,
): boolean {
  if (!horizInBuilding(pos.x, pos.z, b, margin)) return false
  const top = groundY + b.height
  return pos.y > groundY - 0.5 && pos.y < top + 1.4
}

/** Push a walking position out of building walls (allow roof decks). */
export function resolveBuildingPush(
  pos: { x: number; y: number; z: number },
  getHeight: (x: number, z: number) => number,
  margin = 0.35,
  interiorId = -1,
): { x: number; z: number } {
  let x = pos.x
  let z = pos.z
  const support = sampleCitySupport(x, z, getHeight)
  if (support.onRoof && pos.y >= support.y - 0.8) {
    return { x, z }
  }
  for (const b of CITY_BUILDINGS) {
    if (interiorId === b.id) continue
    const gy = getHeight(b.x, b.z)
    const roof = gy + b.height
    if (pos.y >= roof - 0.5) continue
    if (!horizInBuilding(x, z, b, margin)) continue
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

/** Keep walker inside an enterable building footprint. */
export function clampInsideBuilding(
  x: number,
  z: number,
  b: CityBuilding,
  inset = 0.85,
): { x: number; z: number } {
  const halfW = b.width * 0.5 - inset
  const halfD = buildingDepth(b) * 0.5 - inset
  return {
    x: Math.max(b.x - halfW, Math.min(b.x + halfW, x)),
    z: Math.max(b.z - halfD, Math.min(b.z + halfD, z)),
  }
}
