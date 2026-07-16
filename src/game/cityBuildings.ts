/** Shared city building defs — visuals and collision must stay in sync. */

/** Raised street deck above downtown terrain (roads, walkers, traffic). */
export const CITY_STREET_DECK = 0.12

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
  // Muted urban facade tints — GTA-lite concrete/glass city
  { id: 0, x: 10, width: 9, z: 30, height: 10, color: '#8a8f96', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'CAFE', shopColor: '#c1121f' },
  { id: 1, x: 33, width: 10, z: 30, height: 18, color: '#6d737c', windows: win([false, true, true, false]), roofLandable: true, enterable: false },
  { id: 2, x: 54, width: 8, z: 30, height: 26, color: '#5c636b', windows: win([true, true, false, true]), roofLandable: true, enterable: false },
  { id: 3, x: 76, width: 10, z: 30, height: 12, color: '#7a828a', windows: win([true, false, false, true]), roofLandable: true, enterable: true, shop: 'BOOKS', shopColor: '#2a6f4e' },
  { id: 4, x: -12, width: 7, z: 30, height: 9, color: '#9a8570', windows: win([false, true, true, true]), roofLandable: true, enterable: true, shop: 'BURGERS', shopColor: '#e9a825' },
  { id: 5, x: 10, width: 9, z: 54, height: 20, color: '#6b7179', windows: win([true, true, true, false]), roofLandable: true, enterable: false },
  { id: 6, x: 32, width: 7, z: 54, height: 11, color: '#858c94', windows: win([false, false, true, true]), roofLandable: true, enterable: true, shop: 'PHARMACY', shopColor: '#2d6a4f' },
  { id: 7, x: 54, width: 10, z: 74, height: 18, color: '#555b63', windows: win([true, true, true, true]), roofLandable: true, enterable: false },
  { id: 8, x: 76, width: 9, z: 54, height: 12, color: '#8d939a', windows: win([true, false, true, false]), roofLandable: true, enterable: true, shop: 'SUPERMARKET', shopColor: '#b91c1c' },
  { id: 9, x: 98, width: 11, z: 52, height: 22, color: '#646b74', windows: win([false, true, false, true]), roofLandable: true, enterable: false },
  { id: 10, x: 10, width: 6, z: 76, height: 8, color: '#9b7e6a', windows: win([true, true, false, false]), roofLandable: true, enterable: true, shop: 'BARBER', shopColor: '#c45c26' },
  { id: 11, x: 54, width: 9, z: 98, height: 12, color: '#7e868f', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'BANK', shopColor: '#c9a227' },
  { id: 12, x: 120, width: 10, z: 76, height: 16, color: '#5f666f', windows: win([true, true, false, true]), roofLandable: true, enterable: false },
  { id: 13, x: 152, width: 8, z: 54, height: 14, color: '#6a6578', windows: win([false, true, true, false]), roofLandable: true, enterable: true, shop: 'TECH', shopColor: '#5a189a' },
  { id: 14, x: 174, width: 10, z: 98, height: 24, color: '#4e555e', windows: win([true, false, true, true]), roofLandable: true, enterable: false },
  { id: 15, x: 186, width: 9, z: 76, height: 10, color: '#8a7a82', windows: win([true, true, true, false]), roofLandable: true, enterable: true, shop: 'FLOWERS', shopColor: '#c9184a' },
  { id: 16, x: 98, width: 7, z: 120, height: 9, color: '#818890', windows: win([false, false, true, true]), roofLandable: true, enterable: true, shop: 'SUSHI', shopColor: '#d62828' },
  { id: 17, x: 120, width: 10, z: 142, height: 15, color: '#5a6169', windows: win([true, true, false, false]), roofLandable: true, enterable: false },
  { id: 18, x: -32, width: 8, z: 30, height: 14, color: '#8b8474', windows: win([true, true, false, true]), roofLandable: true, enterable: true, shop: 'HOTEL', shopColor: '#9a7b0a' },
  { id: 19, x: -32, width: 10, z: 54, height: 16, color: '#616872', windows: win([false, true, true, true]), roofLandable: true, enterable: false },
  { id: 20, x: 32, width: 7, z: 98, height: 10, color: '#6e7d86', windows: win([true, false, true, false]), roofLandable: true, enterable: true, shop: 'GYM', shopColor: '#0077b6' },
  { id: 21, x: 76, width: 9, z: 164, height: 20, color: '#50565e', windows: win([true, true, true, false]), roofLandable: true, enterable: false },
  { id: 22, x: 120, width: 8, z: 120, height: 12, color: '#7a7368', windows: win([false, true, false, true]), roofLandable: true, enterable: true, shop: 'RADIO', shopColor: '#e07a1f' },
  { id: 23, x: 208, width: 12, z: 98, height: 28, color: '#4a515a', windows: win([true, true, true, true]), roofLandable: true, enterable: false },
  { id: 24, x: 208, width: 8, z: 142, height: 11, color: '#8a7068', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'DINER', shopColor: '#b91c1c' },
  { id: 25, x: 32, width: 10, z: 142, height: 16, color: '#5c636c', windows: win([false, true, true, false]), roofLandable: true, enterable: false },
  { id: 26, x: 164, width: 7, z: 174, height: 9, color: '#8a7d6c', windows: win([true, true, false, true]), roofLandable: true, enterable: true, shop: 'BAKERY', shopColor: '#d48a3a' },
  { id: 27, x: 186, width: 9, z: 30, height: 20, color: '#555c65', windows: win([true, false, true, false]), roofLandable: true, enterable: false },
  { id: 28, x: -12, width: 9, z: 98, height: 12, color: '#dfe3e8', windows: win([true, true, true, false]), roofLandable: true, enterable: true, shop: 'HOSPITAL', shopColor: '#1d8a99' },
  { id: 29, x: 54, width: 11, z: 174, height: 22, color: '#4c535c', windows: win([false, true, false, true]), roofLandable: true, enterable: false },
  { id: 30, x: 230, width: 10, z: 54, height: 12, color: '#7a5c5c', windows: win([true, false, true, true]), roofLandable: true, enterable: true, shop: 'FIRE', shopColor: '#9b2226' },
  { id: 31, x: 98, width: 8, z: 30, height: 11, color: '#6e6578', windows: win([true, true, false, false]), roofLandable: true, enterable: true, shop: 'TAILOR', shopColor: '#5c3d8a' },
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
  let best = terrain + CITY_STREET_DECK + (onSidewalk(x, z) ? 0.04 : 0)
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

/** Street-level elevator alcove on the +Z face (offset from shop door). */
export function elevatorStreetPos(
  b: CityBuilding,
  getHeight: (x: number, z: number) => number,
): { x: number; y: number; z: number } {
  const d = buildingDepth(b)
  return {
    x: b.x - Math.min(2.4, b.width * 0.28),
    y: getHeight(b.x, b.z),
    z: b.z + d * 0.5 + 1.15,
  }
}

/** Rooftop elevator hatch near the +Z parapet. */
export function elevatorRoofPos(
  b: CityBuilding,
  getHeight: (x: number, z: number) => number,
): { x: number; y: number; z: number } {
  const d = buildingDepth(b)
  return {
    x: b.x - Math.min(2.4, b.width * 0.28),
    y: buildingRoofY(b, getHeight),
    z: b.z + d * 0.28,
  }
}

export function nearestElevatorBuilding(
  x: number,
  z: number,
  y: number,
  buildingIds: number[],
  getHeight: (x: number, z: number) => number,
  range = 3.6,
): { building: CityBuilding; toRoof: boolean } | null {
  let best: { building: CityBuilding; toRoof: boolean } | null = null
  let bestD = range
  for (const id of buildingIds) {
    const b = getBuildingById(id)
    if (!b) continue
    const street = elevatorStreetPos(b, getHeight)
    const roof = elevatorRoofPos(b, getHeight)
    const onRoof = y > roof.y - 2.5
    const target = onRoof ? roof : street
    const d = Math.hypot(target.x - x, target.z - z)
    if (d < bestD) {
      bestD = d
      best = { building: b, toRoof: !onRoof }
    }
  }
  return best
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

/** Snap pose just inside the doorway, facing into the shop. */
export function interiorEntryPos(
  b: CityBuilding,
  getHeight: (x: number, z: number) => number,
  fromTunnel = false,
): { x: number; y: number; z: number; yaw: number } {
  const d = buildingDepth(b)
  const door = doorWorldPos(b, getHeight)
  const x = fromTunnel ? b.x : door.x
  const z = fromTunnel ? b.z - d * 0.12 : door.z - 1.35
  return {
    x,
    z,
    y: getHeight(b.x, b.z) + 0.15,
    yaw: Math.atan2(b.x - door.x, b.z - door.z),
  }
}

export function nearestEnterableDoor(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
  range = 4.2,
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
  yaw = 0,
): boolean {
  const samples = [
    pos,
    // Wing / rotor tips — stop clipping through facades
    {
      x: pos.x + Math.cos(yaw) * 4.2,
      y: pos.y,
      z: pos.z - Math.sin(yaw) * 4.2,
    },
    {
      x: pos.x - Math.cos(yaw) * 4.2,
      y: pos.y,
      z: pos.z + Math.sin(yaw) * 4.2,
    },
    {
      x: pos.x + Math.sin(yaw) * 2.2,
      y: pos.y,
      z: pos.z + Math.cos(yaw) * 2.2,
    },
  ]
  for (const sample of samples) {
    for (const b of CITY_BUILDINGS) {
      if (interiorId === b.id) continue
      const gy = getHeight(b.x, b.z)
      const roof = gy + b.height
      if (!horizInBuilding(sample.x, sample.z, b, 0.85)) continue
      if (sample.y >= roof - 0.9) continue
      if (sample.y <= gy + 1.15) continue
      return true
    }
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
