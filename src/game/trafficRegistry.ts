/** Shared live traffic snapshot for boarding / driving city vehicles. */

export type TrafficKind = 'car' | 'bus' | 'police' | 'fire' | 'taxi'

export type TrafficSnapshot = {
  id: number
  kind: TrafficKind
  x: number
  z: number
  yaw: number
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
  let bestD = range
  for (const v of vehicles) {
    if (v.taken) continue
    const d = Math.hypot(v.x - x, v.z - z)
    if (d < bestD) {
      bestD = d
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
      return 16
    case 'fire':
      return 20
    case 'police':
      return 24
    default:
      return 22
  }
}
