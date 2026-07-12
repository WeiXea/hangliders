import type { FlightState, Vec3 } from '../types/game'
import { SOCIAL_RANGE, TANDEM_RANGE } from '../types/game'

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

export function canOfferTandem(local: FlightState, remote: FlightState | null): boolean {
  if (!remote) return false
  if (local.tandemRole !== 'none' || remote.tandemRole !== 'none') {
    return local.tandemRole !== 'none' // show leave when already tandem
  }
  if (horizontalDist(local.position, remote.position) > TANDEM_RANGE) return false
  const localOk = local.phase === 'walking' || isOnGlider(local.phase)
  const remoteOk = remote.phase === 'walking' || isOnGlider(remote.phase)
  // Don't pair mid-freefall / chute
  if (!localOk || !remoteOk) return false
  if (local.phase === 'freefall' || remote.phase === 'freefall') return false
  if (local.phase === 'parachuting' || remote.phase === 'parachuting') return false
  return true
}
