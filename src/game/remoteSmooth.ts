import type { FlightState } from '../types/game'

let latest: FlightState | null = null
let recvMs = 0

export function noteRemoteFlight(flight: FlightState | null) {
  latest = flight ? { ...flight, position: { ...flight.position }, velocity: { ...flight.velocity } } : null
  recvMs = performance.now()
}

/** Extrapolate the last remote snapshot so passenger framing stays smooth between packets. */
export function predictedRemote(now = performance.now()): FlightState | null {
  if (!latest) return null
  const age = Math.min(0.22, Math.max(0, (now - recvMs) / 1000))
  const p = latest.position
  const v = latest.velocity
  return {
    ...latest,
    position: {
      x: p.x + v.x * age,
      y: p.y + v.y * age,
      z: p.z + v.z * age,
    },
    // Keep attitude from last packet; slight yaw integrate from bank if flying
    yaw: latest.yaw + (latest.phase === 'flying' ? -latest.roll * 0.35 * age : 0),
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

/** Smoothly chase a predicted pilot craft each display frame. */
export function smoothFollowPilot(
  local: FlightState,
  remote: FlightState,
  dt: number,
): FlightState {
  const predicted = predictedRemote() ?? remote
  // Higher = snappier. Keep high enough to track a banked turn without mush.
  const k = 1 - Math.pow(0.00002, dt)
  return {
    ...predicted,
    tandemRole: 'passenger',
    tandemWant: false,
    landAction: 'none',
    position: {
      x: lerp(local.position.x, predicted.position.x, k),
      y: lerp(local.position.y, predicted.position.y, k),
      z: lerp(local.position.z, predicted.position.z, k),
    },
    velocity: { ...predicted.velocity },
    yaw: lerpAngle(local.yaw, predicted.yaw, k),
    pitch: lerp(local.pitch, predicted.pitch, k),
    roll: lerp(local.roll, predicted.roll, k),
    airspeed: lerp(local.airspeed, predicted.airspeed, k),
    altitude: predicted.altitude,
    phase: predicted.phase,
  }
}
