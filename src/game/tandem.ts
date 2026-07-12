import type { BiomeConfig, FlightState, InputState, ParkedGlider } from '../types/game'
import { TANDEM_RANGE, WALK_FEET } from '../types/game'
import { findNearestGlider } from './flightPhysics'
import { horizontalDist, isOnGlider } from './multiplayerSocial'
import { GROUND_CLEARANCE } from './obstacles'

export type TandemResult = {
  flight: FlightState
  parked: ParkedGlider[]
  followPilot: boolean
}

function dropOff(flight: FlightState, config: BiomeConfig, near: FlightState): FlightState {
  const src = near
  const gy = config.getHeight(src.position.x, src.position.z)
  return {
    ...flight,
    phase: 'walking',
    position: {
      x: src.position.x + Math.cos(src.yaw) * 2.5,
      y: gy + WALK_FEET,
      z: src.position.z - Math.sin(src.yaw) * 2.5,
    },
    velocity: { x: 0, y: 0, z: 0 },
    airspeed: 0,
    pitch: 0,
    roll: 0,
    altitude: 0,
    tandemRole: 'none',
    tandemWant: false,
    landAction: 'none',
    mountedId: -1,
    chuteDeployed: false,
    chuteInflation: 0,
    chuteSwing: 0,
  }
}

function bailToFreefall(flight: FlightState, from: FlightState): FlightState {
  return {
    ...flight,
    phase: 'freefall',
    position: {
      x: from.position.x + Math.cos(from.yaw) * 1.2,
      y: from.position.y - 0.4,
      z: from.position.z - Math.sin(from.yaw) * 1.2,
    },
    velocity: {
      x: from.velocity.x * 0.5,
      y: Math.min(from.velocity.y, -2),
      z: from.velocity.z * 0.5,
    },
    airspeed: Math.max(8, from.airspeed * 0.55),
    pitch: 0.25,
    roll: 0,
    altitude: Math.max(from.altitude, 1),
    tandemRole: 'none',
    tandemWant: false,
    landAction: 'none',
    mountedId: -1,
    chuteDeployed: false,
    chuteInflation: 0,
    chuteSwing: 0,
  }
}

function becomePilot(
  flight: FlightState,
  parked: ParkedGlider[],
  config: BiomeConfig,
): { flight: FlightState; parked: ParkedGlider[] } {
  if (isOnGlider(flight.phase)) {
    return {
      flight: { ...flight, tandemRole: 'pilot', tandemWant: false, landAction: 'none' },
      parked,
    }
  }

  const target = findNearestGlider(flight.position.x, flight.position.z, parked)
  if (target) {
    const gy = config.getHeight(target.x, target.z)
    return {
      flight: {
        ...flight,
        phase: 'grounded',
        position: { x: target.x, y: gy + GROUND_CLEARANCE, z: target.z },
        yaw: target.yaw,
        pitch: 0,
        roll: 0,
        airspeed: 0,
        velocity: { x: 0, y: 0, z: 0 },
        altitude: 0,
        mountedId: target.id,
        landAction: 'none',
        tandemRole: 'pilot',
        tandemWant: false,
      },
      parked: parked.map((g) => (g.id === target.id ? { ...g, available: false } : g)),
    }
  }

  const gy = config.getHeight(flight.position.x, flight.position.z)
  return {
    flight: {
      ...flight,
      phase: 'grounded',
      position: { ...flight.position, y: gy + GROUND_CLEARANCE },
      pitch: 0,
      roll: 0,
      airspeed: 0,
      velocity: { x: 0, y: 0, z: 0 },
      altitude: 0,
      landAction: 'none',
      tandemRole: 'pilot',
      tandemWant: false,
    },
    parked,
  }
}

/**
 * Explicit tandem only (no auto-steal while flying solo).
 * T = start/board/leave. Jump as passenger = freefall (chute works after).
 */
export function resolveTandem(
  flight: FlightState,
  remote: FlightState | null,
  input: InputState,
  parked: ParkedGlider[],
  config: BiomeConfig,
): TandemResult {
  if (!remote) {
    return { flight, parked, followPilot: false }
  }

  // Never puppet someone in freefall / under canopy
  if (flight.phase === 'freefall' || flight.phase === 'parachuting') {
    if (flight.tandemRole !== 'none') {
      return {
        flight: { ...flight, tandemRole: 'none', tandemWant: false },
        parked,
        followPilot: false,
      }
    }
    return { flight, parked, followPilot: false }
  }

  const dist = horizontalDist(flight.position, remote.position)
  const near = dist <= TANDEM_RANGE
  let next = flight
  let parkedOut = parked

  // Someone boarded me → I'm the pilot
  if (
    remote.tandemRole === 'passenger' &&
    next.tandemRole !== 'passenger' &&
    isOnGlider(next.phase)
  ) {
    next = { ...next, tandemRole: 'pilot', tandemWant: false }
  }

  // --- Passenger ---
  if (next.tandemRole === 'passenger') {
    if (input.jump) {
      const from =
        remote.tandemRole === 'pilot' || isOnGlider(remote.phase) ? remote : next
      return {
        flight: bailToFreefall(next, from),
        parked: parkedOut,
        followPilot: false,
      }
    }
    if (input.tandem) {
      return {
        flight: dropOff(next, config, isOnGlider(remote.phase) ? remote : next),
        parked: parkedOut,
        followPilot: false,
      }
    }

    if (
      (remote.tandemRole === 'pilot' || remote.tandemRole === 'none') &&
      isOnGlider(remote.phase)
    ) {
      // Follow craft; keep passenger role even if pilot flag lags
      return {
        flight: {
          ...remote,
          tandemRole: 'passenger',
          tandemWant: false,
          landAction: 'none',
        },
        parked: parkedOut,
        followPilot: true,
      }
    }

    if (remote.phase === 'freefall' || remote.phase === 'parachuting') {
      return {
        flight: bailToFreefall(next, remote),
        parked: parkedOut,
        followPilot: false,
      }
    }

    return {
      flight: dropOff(next, config, remote),
      parked: parkedOut,
      followPilot: false,
    }
  }

  // Pilot leaves with T (jump uses normal glider physics)
  if (next.tandemRole === 'pilot' && input.tandem) {
    return {
      flight: { ...next, tandemRole: 'none', tandemWant: false },
      parked: parkedOut,
      followPilot: false,
    }
  }

  // Press T near friend
  if (input.tandem && near) {
    // Board an active pilot (or friend on glider while you walk)
    const canBoard =
      remote.tandemRole === 'pilot' ||
      (isOnGlider(remote.phase) &&
        (next.phase === 'walking' || next.phase === 'grounded' || next.phase === 'landed'))

    if (canBoard && remote.tandemRole !== 'passenger' && isOnGlider(remote.phase)) {
      return {
        flight: {
          ...remote,
          tandemRole: 'passenger',
          tandemWant: false,
          landAction: 'none',
        },
        parked: parkedOut,
        followPilot: true,
      }
    }

    // Offer / start as pilot
    const mounted = becomePilot(next, parkedOut, config)
    return { flight: mounted.flight, parked: mounted.parked, followPilot: false }
  }

  return { flight: next, parked: parkedOut, followPilot: false }
}

export function canOfferTandem(local: FlightState, remote: FlightState | null): boolean {
  if (!remote) return false
  if (local.tandemRole !== 'none') return true
  if (local.phase === 'freefall' || local.phase === 'parachuting') return false
  if (remote.phase === 'freefall' || remote.phase === 'parachuting') return false
  return horizontalDist(local.position, remote.position) <= TANDEM_RANGE
}

export function tandemButtonLabel(local: FlightState, remote: FlightState | null): string {
  if (local.tandemRole === 'pilot') return 'Leave tandem'
  if (local.tandemRole === 'passenger') return 'Leave tandem'
  if (!remote) return 'Tandem'
  if (remote.tandemRole === 'pilot' || isOnGlider(remote.phase)) return 'Board tandem'
  if (isOnGlider(local.phase)) return 'Invite tandem'
  return 'Fly tandem'
}
