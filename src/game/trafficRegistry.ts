/** Shared live traffic snapshot for boarding / driving city vehicles. */

export type TrafficKind = 'car' | 'bus' | 'police' | 'fire' | 'taxi'

export type TrafficSnapshot = {
  id: number
  kind: TrafficKind
  x: number
  z: number
  yaw: number
  /** Current travel speed along the lane (m/s), always ≥ 0 */
  speed: number
  color?: string
  /** Player currently driving this unit */
  taken: boolean
  /** Static curbside car (vs looping traffic) */
  parked?: boolean
}

/** Curbside pickups — walk up and press E. IDs ≥ 100. */
export type ParkedVehicleDef = {
  id: number
  kind: TrafficKind
  x: number
  z: number
  yaw: number
  color?: string
}

export const PARKED_VEHICLES: ParkedVehicleDef[] = [
  { id: 100, kind: 'car', x: 8, z: 5.5, yaw: Math.PI / 2, color: '#2a6f97' },
  { id: 101, kind: 'taxi', x: 18, z: 5.5, yaw: Math.PI / 2, color: '#ffd60a' },
  { id: 102, kind: 'car', x: 50, z: 16.5, yaw: 0, color: '#bc4749' },
  { id: 103, kind: 'police', x: 28, z: 27.5, yaw: Math.PI / 2 },
  { id: 104, kind: 'car', x: 72, z: 49.5, yaw: Math.PI / 2, color: '#457b9d' },
  { id: 105, kind: 'taxi', x: 94, z: 60.5, yaw: 0 },
  { id: 106, kind: 'car', x: 116, z: 104.5, yaw: Math.PI / 2, color: '#6a994e' },
  { id: 107, kind: 'bus', x: 148, z: 88, yaw: 0 },
  { id: 108, kind: 'car', x: 38, z: 71.5, yaw: Math.PI, color: '#e76f51' },
  { id: 109, kind: 'fire', x: 160, z: 115.5, yaw: Math.PI / 2 },
]

const moving: TrafficSnapshot[] = []
const parked: TrafficSnapshot[] = []
const vehicles: TrafficSnapshot[] = []
let takenId = -1

function rebuild() {
  vehicles.length = 0
  for (const v of parked) vehicles.push(v)
  for (const v of moving) vehicles.push(v)
}

export function setMovingTraffic(next: TrafficSnapshot[]) {
  moving.length = 0
  for (const v of next) moving.push(v)
  rebuild()
}

export function setParkedTraffic(next: TrafficSnapshot[]) {
  parked.length = 0
  for (const v of next) parked.push(v)
  rebuild()
}

/** @deprecated use setMovingTraffic — kept for any leftover imports */
export function setTrafficSnapshots(next: TrafficSnapshot[]) {
  setMovingTraffic(next)
}

export function getTrafficSnapshots(): readonly TrafficSnapshot[] {
  return vehicles
}

export function getTakenVehicleId() {
  return takenId
}

export function setTakenVehicleId(id: number) {
  takenId = id
}

export function nearestTrafficVehicle(
  x: number,
  z: number,
  range = 6.5,
): TrafficSnapshot | null {
  let best: TrafficSnapshot | null = null
  let bestScore = Infinity
  for (const v of vehicles) {
    if (v.taken) continue
    const d = Math.hypot(v.x - x, v.z - z)
    if (d > range) continue
    // Prefer parked / stopped cars
    const score = d + v.speed * 0.55 + (v.parked ? -1.5 : 0)
    if (score < bestScore) {
      bestScore = score
      best = v
    }
  }
  return best
}

export function vehicleRestClearance(kind: TrafficKind): number {
  return kind === 'bus' || kind === 'fire' ? 0.35 : 0.25
}

export function vehicleMaxSpeed(kind: TrafficKind): number {
  switch (kind) {
    case 'bus':
      return 12
    case 'fire':
      return 15
    case 'police':
      return 18
    case 'taxi':
      return 14
    default:
      return 14
  }
}

export function vehicleAccel(kind: TrafficKind): number {
  switch (kind) {
    case 'bus':
      return 4.5
    case 'fire':
      return 7
    case 'police':
      return 9
    default:
      return 7.5
  }
}

export function vehicleBrake(kind: TrafficKind): number {
  switch (kind) {
    case 'bus':
      return 11
    case 'fire':
      return 14
    default:
      return 16
  }
}

/** True if ped is in the vehicle's forward path (road-width cone). */
export function pedInVehiclePath(
  vx: number,
  vz: number,
  yaw: number,
  pedX: number,
  pedZ: number,
  lookahead = 18,
  halfWidth = 5.5,
): { ahead: number; lateral: number } | null {
  const dx = pedX - vx
  const dz = pedZ - vz
  const dist = Math.hypot(dx, dz)
  if (dist < 0.35 || dist > lookahead + 2) return null
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)
  const ahead = dx * fx + dz * fz
  const lateral = Math.abs(dx * fz - dz * fx)
  if (ahead < 0.6 || ahead > lookahead) return null
  if (lateral > halfWidth) return null
  return { ahead, lateral }
}
