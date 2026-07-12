import type { FlightState, InputState, Vec3 } from '../types/game'

/** Typical hang-glider ballpark: L/D ~12, min sink ~1.2–1.8 m/s at ~11 m/s. */
const RHO = 1.2
const WING_AREA = 16
const MASS = 110 // pilot + glider kg (forces scaled for game feel)
const G = 9.81

export type AeroResult = {
  acceleration: Vec3
  airspeed: number
  aoa: number
  cl: number
  cd: number
  stallWarning: boolean
  stallSeverity: number
  liftMag: number
  dragMag: number
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Cl curve: peaks near 12°, progressive stall after ~16°. */
export function liftCoeff(aoaRad: number): { cl: number; stallSeverity: number } {
  const deg = (aoaRad * 180) / Math.PI
  const stallStart = 14
  const stallFull = 28
  let cl: number
  if (deg < -4) {
    cl = -0.35 + deg * 0.04
  } else if (deg < stallStart) {
    cl = 0.25 + deg * 0.085
  } else {
    const t = clamp((deg - stallStart) / (stallFull - stallStart), 0, 1)
    const peak = 0.25 + stallStart * 0.085
    cl = peak * (1 - t * 0.85) - t * 0.2
  }
  const stallSeverity =
    deg > stallStart ? clamp((deg - stallStart) / (stallFull - stallStart), 0, 1) : 0
  return { cl: clamp(cl, -0.6, 1.45), stallSeverity }
}

/** Cd = parasite + induced + stall blob. */
export function dragCoeff(aoaRad: number, cl: number, stallSeverity: number): number {
  const cd0 = 0.028
  const induced = (cl * cl) / (Math.PI * 5.5 * 0.85) // AR~5.5, e~0.85
  const stallBlob = stallSeverity * stallSeverity * 0.55
  const aoaExtra = Math.abs(aoaRad) * 0.08
  return cd0 + induced + stallBlob + aoaExtra
}

/**
 * Compute aerodynamic acceleration in world space from attitude + velocity.
 * Lift ⟂ air-relative velocity (up relative to wing), drag opposite velocity.
 */
export function computeAeroForces(
  flight: FlightState,
  input: InputState,
  wind: Vec3,
): AeroResult {
  const airRel = {
    x: flight.velocity.x - wind.x,
    y: flight.velocity.y - wind.y,
    z: flight.velocity.z - wind.z,
  }
  let airspeed = Math.hypot(airRel.x, airRel.y, airRel.z)
  if (airspeed < 0.5) airspeed = 0.5

  // Flight-path pitch from velocity; AoA ≈ geometric pitch − path pitch
  const pathPitch = Math.asin(clamp(airRel.y / airspeed, -1, 1))
  const aoa = flight.pitch - pathPitch

  // Speed-bar / trim: push-out (pitchUp) increases AoA feel; pull-in lowers
  const trim = input.pitchUp ? 0.04 : input.pitchDown ? -0.06 : 0
  const aoaEff = aoa + trim

  const { cl, stallSeverity } = liftCoeff(aoaEff)
  const cd = dragCoeff(aoaEff, cl, stallSeverity)

  const q = 0.5 * RHO * airspeed * airspeed
  const liftMag = q * WING_AREA * cl
  const dragMag = q * WING_AREA * cd

  // Unit air-velocity
  const vx = airRel.x / airspeed
  const vy = airRel.y / airspeed
  const vz = airRel.z / airspeed

  // Wing "up" from yaw/pitch/roll (simplified body up)
  const cy = Math.cos(flight.yaw)
  const sy = Math.sin(flight.yaw)
  const cp = Math.cos(flight.pitch)
  const sp = Math.sin(flight.pitch)
  const cr = Math.cos(flight.roll)
  const sr = Math.sin(flight.roll)

  // Body up in world (approximate)
  let ux = -sy * sp * cr + cy * sr
  let uy = cp * cr
  let uz = -cy * sp * cr - sy * sr
  // Orthonormalize lift direction ⟂ velocity: L_dir = normalize(up × v) × v ... 
  // Simpler: project up onto plane ⟂ v
  const upDotV = ux * vx + uy * vy + uz * vz
  ux -= upDotV * vx
  uy -= upDotV * vy
  uz -= upDotV * vz
  let ulen = Math.hypot(ux, uy, uz)
  if (ulen < 1e-4) {
    // Fallback: world up projected
    ux = -vx * vy
    uy = 1 - vy * vy
    uz = -vz * vy
    ulen = Math.hypot(ux, uy, uz) || 1
  }
  ux /= ulen
  uy /= ulen
  uz /= ulen

  // Forces → acceleration (game scale: boost so feel matches prior speeds)
  const scale = 1 / MASS
  const ax =
    (-vx * dragMag + ux * liftMag) * scale
  const ay =
    (-vy * dragMag + uy * liftMag) * scale - G
  const az =
    (-vz * dragMag + uz * liftMag) * scale

  // Mild adverse yaw / roll damping as force tweak via lateral
  const adverse = flight.roll * airspeed * 0.15

  return {
    acceleration: {
      x: ax + Math.cos(flight.yaw) * adverse * 0.02,
      y: ay,
      z: az - Math.sin(flight.yaw) * adverse * 0.02,
    },
    airspeed,
    aoa: aoaEff,
    cl,
    cd,
    stallWarning: stallSeverity > 0.15 || airspeed < 8.5,
    stallSeverity,
    liftMag,
    dragMag,
  }
}

/** Soft ground-effect: reduce sink when within ~wing span of ground. */
export function groundEffectFactor(altitude: number): number {
  if (altitude > 12) return 1
  if (altitude < 0.5) return 0.55
  return 0.55 + 0.45 * (altitude / 12)
}
