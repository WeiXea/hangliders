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

/** Mutable world cars — updated when the player exits so they stay put. */
const liveParked: ParkedVehicleDef[] = PARKED_VEHICLES.map((p) => ({ ...p }))
/** Lane traffic ids that were driven then left in the world (no longer loop). */
const claimedLanes = new Set<number>()

export function getLiveParkedVehicles(): readonly ParkedVehicleDef[] {
  return liveParked
}

export function isLaneClaimed(laneId: number) {
  return claimedLanes.has(laneId)
}

/**
 * Leave the current car in the world at (x,z) so it can be boarded again.
 * Lane cars become parked; curb cars relocate to the exit pose.
 */
export function leaveVehicleInWorld(
  id: number,
  kind: TrafficKind,
  x: number,
  z: number,
  yaw: number,
  color?: string,
) {
  const existing = liveParked.find((p) => p.id === id)
  if (existing) {
    existing.x = x
    existing.z = z
    existing.yaw = yaw
    if (color) existing.color = color
    return
  }
  liveParked.push({ id, kind, x, z, yaw, color })
  if (id >= 0 && id < 100) claimedLanes.add(id)
}

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
      return 11
    case 'fire':
      return 16
    case 'police':
      return 22
    case 'taxi':
      return 17
    default:
      return 15
  }
}

export function vehicleAccel(kind: TrafficKind): number {
  switch (kind) {
    case 'bus':
      return 3.8
    case 'fire':
      return 7.5
    case 'police':
      return 11
    case 'taxi':
      return 8.5
    default:
      return 8
  }
}

export function vehicleBrake(kind: TrafficKind): number {
  switch (kind) {
    case 'bus':
      return 10
    case 'fire':
      return 14
    case 'police':
      return 18
    case 'taxi':
      return 15
    default:
      return 15
  }
}

/** Engine note profile: idle Hz, high Hz, volume scale */
export function vehicleEngineProfile(kind: TrafficKind): {
  idle: number
  high: number
  vol: number
  grit: number
} {
  switch (kind) {
    case 'bus':
      return { idle: 55, high: 140, vol: 0.07, grit: 0.55 }
    case 'fire':
      return { idle: 70, high: 200, vol: 0.085, grit: 0.7 }
    case 'police':
      return { idle: 85, high: 260, vol: 0.075, grit: 0.45 }
    case 'taxi':
      return { idle: 75, high: 220, vol: 0.065, grit: 0.4 }
    default:
      return { idle: 72, high: 210, vol: 0.07, grit: 0.42 }
  }
}

export function vehicleRadius(kind: TrafficKind): number {
  switch (kind) {
    case 'bus':
      return 3.4
    case 'fire':
      return 3.0
    case 'police':
    case 'taxi':
    case 'car':
    default:
      return 1.85
  }
}

/** World-space shove applied to NPC traffic after a player hit. */
export type NpcVehicleHit = {
  dx: number
  dz: number
  impulse: number
  stun: number
}

const npcHits = new Map<number, NpcVehicleHit>()

export function queueNpcVehicleHit(id: number, hit: NpcVehicleHit) {
  const prev = npcHits.get(id)
  if (!prev || hit.impulse >= prev.impulse) npcHits.set(id, hit)
  else {
    npcHits.set(id, {
      dx: prev.dx + hit.dx * 0.5,
      dz: prev.dz + hit.dz * 0.5,
      impulse: Math.max(prev.impulse, hit.impulse),
      stun: Math.max(prev.stun, hit.stun),
    })
  }
}

export function consumeNpcVehicleHit(id: number): NpcVehicleHit | null {
  const hit = npcHits.get(id)
  if (!hit) return null
  npcHits.delete(id)
  return hit
}

export type DriveCollisionResult = {
  x: number
  z: number
  yaw: number
  /** Signed travel speed along yaw */
  speed: number
  /** Closing speed of hardest hit this step */
  impact: number
}

/**
 * Keep the driven car from overlapping other traffic / parked / remote-driven cars.
 * Returns separated pose + reduced speed; queues NPC shoves for AI cars.
 */
export function resolveDriveCollisions(
  selfId: number,
  selfKind: TrafficKind,
  x: number,
  z: number,
  yaw: number,
  speed: number,
): DriveCollisionResult {
  let impact = 0
  const selfR = vehicleRadius(selfKind)
  const list = vehicles
  const speedIn = speed

  for (let pass = 0; pass < 2; pass++) {
    for (const v of list) {
      if (v.id === selfId) continue
      // Ignore other taken snaps that sit on a driver (remote uses RemotePlayer mesh)
      // except we DO want to collide with remote-driven cars — those are taken at remote pos.
      // Only skip exact self.
      const minDist = selfR + vehicleRadius(v.kind)
      let dx = x - v.x
      let dz = z - v.z
      let dist = Math.hypot(dx, dz)
      if (dist >= minDist) continue
      if (dist < 1e-4) {
        dx = Math.sin(yaw)
        dz = Math.cos(yaw)
        dist = 1e-4
      }
      const nx = dx / dist
      const nz = dz / dist
      const overlap = minDist - dist
      // Separate positions — always
      x += nx * overlap * 1.02
      z += nz * overlap * 1.02

      const pvx = Math.sin(yaw) * speed
      const pvz = Math.cos(yaw) * speed
      const ovx = Math.sin(v.yaw) * v.speed
      const ovz = Math.cos(v.yaw) * v.speed
      const relN = (pvx - ovx) * nx + (pvz - ovz) * nz

      // Only smash speed on a real hit — soft overlaps just push apart
      if (relN < -1.15) {
        const closing = -relN
        impact = Math.max(impact, closing)
        const keep = Math.max(0, 1 - closing * 0.08)
        speed *= keep
        if (closing > 6) speed *= 0.45
        const side = -Math.sin(yaw) * nz + Math.cos(yaw) * nx
        yaw += Math.max(-0.35, Math.min(0.35, side * closing * 0.03))

        if (!v.taken) {
          const shove = closing * 0.3 + overlap * 0.4
          queueNpcVehicleHit(v.id, {
            dx: -nx * shove,
            dz: -nz * shove,
            impulse: closing,
            stun: Math.min(2.2, 0.35 + closing * 0.12),
          })
        }
      }
    }
  }

  // Never let soft contact fully cancel throttle the player just applied
  if (Math.abs(speedIn) > 0.4 && Math.abs(speed) < Math.abs(speedIn) * 0.15 && impact < 1.15) {
    speed = speedIn * 0.85
  }
  if (Math.abs(speed) < 0.12) speed = 0
  return { x, z, yaw, speed, impact }
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
