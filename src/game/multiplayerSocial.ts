import type { FlightState, Vec3 } from '../types/game'
import { SOCIAL_RANGE } from '../types/game'

export function horizontalDist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.hypot(dx, dz)
}

export function bearingTo(from: Vec3, to: Vec3): number {
  return Math.atan2(to.x - from.x, to.z - from.z)
}

export function isGroundSocial(phase: FlightState['phase']): boolean {
  return phase === 'walking' || phase === 'grounded' || phase === 'landed'
}

export function isOnGlider(phase: FlightState['phase']): boolean {
  return phase === 'grounded' || phase === 'running' || phase === 'flying' || phase === 'landed'
}

export function canSocialEmote(local: FlightState, remote: FlightState | null): boolean {
  if (!remote) return false
  if (local.phase !== 'walking' || remote.phase !== 'walking') return false
  return horizontalDist(local.position, remote.position) <= SOCIAL_RANGE
}

