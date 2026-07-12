import type { FlightState } from '../types/game'

type Sample = { flight: FlightState; at: number }

let a: Sample | null = null
let b: Sample | null = null

export function noteRemoteFlight(flight: FlightState | null) {
  if (!flight) {
    a = null
    b = null
    return
  }
  const snap: Sample = {
    flight: {
      ...flight,
      position: { ...flight.position },
      velocity: { ...flight.velocity },
    },
    at: performance.now(),
  }
  a = b
  b = snap
}

function lerp(x: number, y: number, t: number) {
  return x + (y - x) * t
}

function lerpAngle(x: number, y: number, t: number) {
  let d = y - x
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return x + d * t
}

/** Interpolate between last two packets, then extrapolate slightly past the newest. */
export function predictedRemote(now = performance.now()): FlightState | null {
  if (!b) return null
  if (!a || b.at === a.at) {
    const age = Math.min(0.2, Math.max(0, (now - b.at) / 1000))
    const f = b.flight
    return {
      ...f,
      position: {
        x: f.position.x + f.velocity.x * age,
        y: f.position.y + f.velocity.y * age,
        z: f.position.z + f.velocity.z * age,
      },
      yaw: f.yaw + (f.phase === 'flying' ? -f.roll * 0.3 * age : 0),
    }
  }

  const span = Math.max(16, b.at - a.at)
  // Render time slightly behind newest packet to allow interpolation
  const renderAt = now - 40
  let t = (renderAt - a.at) / span
  if (t < 0) t = 0
  if (t <= 1) {
    const fa = a.flight
    const fb = b.flight
    return {
      ...fb,
      position: {
        x: lerp(fa.position.x, fb.position.x, t),
        y: lerp(fa.position.y, fb.position.y, t),
        z: lerp(fa.position.z, fb.position.z, t),
      },
      velocity: {
        x: lerp(fa.velocity.x, fb.velocity.x, t),
        y: lerp(fa.velocity.y, fb.velocity.y, t),
        z: lerp(fa.velocity.z, fb.velocity.z, t),
      },
      yaw: lerpAngle(fa.yaw, fb.yaw, t),
      pitch: lerp(fa.pitch, fb.pitch, t),
      roll: lerp(fa.roll, fb.roll, t),
      airspeed: lerp(fa.airspeed, fb.airspeed, t),
    }
  }

  // Past newest — extrapolate
  const age = Math.min(0.18, (now - b.at) / 1000)
  const f = b.flight
  return {
    ...f,
    position: {
      x: f.position.x + f.velocity.x * age,
      y: f.position.y + f.velocity.y * age,
      z: f.position.z + f.velocity.z * age,
    },
    yaw: f.yaw + (f.phase === 'flying' ? -f.roll * 0.3 * age : 0),
  }
}

/** Smoothly chase a predicted pilot craft each display frame. */
export function smoothFollowPilot(
  local: FlightState,
  remote: FlightState,
  dt: number,
): FlightState {
  const predicted = predictedRemote() ?? remote
  const k = 1 - Math.pow(0.000008, dt)
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
