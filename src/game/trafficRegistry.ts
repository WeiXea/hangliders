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
}

const vehicles: TrafficSnapshot[] = []
let takenId = -1

export function setTrafficSnapshots(next: TrafficSnapshot[]) {
  vehicles.length = 0
  for (const v of next) vehicles.push(v)
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
  range = 5.5,
): TrafficSnapshot | null {
  let best: TrafficSnapshot | null = null
  let bestScore = Infinity
  for (const v of vehicles) {
    if (v.taken) continue
    const d = Math.hypot(v.x - x, v.z - z)
    if (d > range) continue
    // Prefer nearly stopped cars so boarding feels intentional
    const score = d + v.speed * 0.35
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
