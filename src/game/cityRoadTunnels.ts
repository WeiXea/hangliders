/**
 * Road underpasses — dipped below street level with ramps at each mouth.
 * Cars enter one end, drive under the deck, and climb out the other.
 */
export type RoadTunnel = {
  id: number
  x: number
  z: number
  /** Travel axis: cars move along this world axis */
  axis: 'x' | 'z'
  length: number
  halfW: number
  label: string
}

/** How far the tunnel floor sits below street deck (meters). */
export const ROAD_TUNNEL_DIP = 3.6
/** Ramp length inside each portal (meters). */
export const ROAD_TUNNEL_RAMP = 12

export const ROAD_TUNNELS: RoadTunnel[] = [
  { id: 0, x: 44, z: 120, axis: 'z', length: 48, halfW: 5.8, label: 'Central Underpass' },
  { id: 1, x: 100, z: 66, axis: 'x', length: 52, halfW: 5.8, label: 'Midtown Underpass' },
]

export function inRoadTunnel(x: number, z: number): RoadTunnel | null {
  for (const t of ROAD_TUNNELS) {
    if (t.axis === 'z') {
      if (Math.abs(x - t.x) <= t.halfW && Math.abs(z - t.z) <= t.length * 0.5) return t
    } else if (Math.abs(z - t.z) <= t.halfW && Math.abs(x - t.x) <= t.length * 0.5) {
      return t
    }
  }
  return null
}

/** Along-tunnel coordinate relative to center (−length/2 … +length/2). */
export function roadTunnelAlong(t: RoadTunnel, x: number, z: number): number {
  return t.axis === 'z' ? z - t.z : x - t.x
}

/**
 * Floor height for a point inside a road underpass (street deck at the mouths,
 * full dip in the middle). Returns null when not inside a tunnel.
 */
export function roadTunnelFloorY(
  x: number,
  z: number,
  getHeight: (x: number, z: number) => number,
  streetDeck = 0.12,
): number | null {
  const t = inRoadTunnel(x, z)
  if (!t) return null
  const street = getHeight(t.x, t.z) + streetDeck
  const along = Math.abs(roadTunnelAlong(t, x, z))
  const half = t.length * 0.5
  const flatEnd = half - ROAD_TUNNEL_RAMP
  let dip = ROAD_TUNNEL_DIP
  if (along > flatEnd) {
    const u = Math.max(0, Math.min(1, (half - along) / ROAD_TUNNEL_RAMP))
    dip = ROAD_TUNNEL_DIP * (u * u * (3 - 2 * u))
  }
  return street - dip
}
