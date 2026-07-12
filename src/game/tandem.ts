import type { BiomeConfig, FlightState, InputState, ParkedGlider } from '../types/game'
import { TANDEM_RANGE, WALK_FEET } from '../types/game'
import { findNearestGlider } from './flightPhysics'
import { horizontalDist, isOnGlider } from './multiplayerSocial'
import { GROUND_CLEARANCE } from './obstacles'

export type TandemResult = {
  flight: FlightState
  parked: ParkedGlider[]
  /** Passenger is copying the pilot — skip local physics */
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
 * One-press tandem:
 * - Near a friend on a glider → Board (passenger)
 * - Otherwise → you become pilot (mount if needed); friend boards with T or auto when close
 * - Press T again to leave
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

  const dist = horizontalDist(flight.position, remote.position)
  const near = dist <= TANDEM_RANGE
  let next = flight
  let parkedOut = parked

  // Friend boarded onto my craft → promote me to pilot
  if (
    remote.tandemRole === 'passenger' &&
    next.tandemRole !== 'passenger' &&
    (isOnGlider(next.phase) || next.tandemRole === 'pilot')
  ) {
    next = { ...next, tandemRole: 'pilot', tandemWant: false }
  }

  // Leave tandem
  if ((input.tandem || input.jump) && next.tandemRole !== 'none') {
    // Jump only hops passenger off; pilot jump is handled by normal physics
    if (input.jump && next.tandemRole === 'pilot') {
      /* fall through — pilot may jump off glider normally later */
    } else {
      return {
        flight: dropOff(next, config, isOnGlider(remote.phase) ? remote : next),
        parked: parkedOut,
        followPilot: false,
      }
    }
  }

  // Passenger: follow pilot (tolerate brief sync lag)
  if (next.tandemRole === 'passenger') {
    const pilotReady =
      remote.tandemRole === 'pilot' ||
      (isOnGlider(remote.phase) && remote.tandemRole !== 'passenger')

    if (pilotReady) {
      return {
        flight: {
          ...remote,
          tandemRole: 'passenger',
          tandemWant: false,
          landAction: next.landAction,
        },
        parked: parkedOut,
        followPilot: true,
      }
    }

    // Pilot jumped / walked away — hop off
    if (
      remote.phase === 'walking' ||
      remote.phase === 'freefall' ||
      remote.phase === 'parachuting' ||
      remote.phase === 'crashed'
    ) {
      return {
        flight: dropOff(next, config, remote),
        parked: parkedOut,
        followPilot: false,
      }
    }

    // Waiting for pilot sync — hold still
    return { flight: next, parked: parkedOut, followPilot: true }
  }

  // One-press join / start
  if (input.tandem && near) {
    const friendFlying =
      remote.tandemRole === 'pilot' || isOnGlider(remote.phase)

    if (friendFlying && remote.tandemRole !== 'passenger') {
      // Board friend's glider
      next = { ...next, tandemRole: 'passenger', tandemWant: false, landAction: 'none' }
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

    // You become the pilot
    const mounted = becomePilot(next, parkedOut, config)
    next = mounted.flight
    parkedOut = mounted.parked
    return { flight: next, parked: parkedOut, followPilot: false }
  }

  // Auto-board when standing next to a pilot (no second sync dance)
  if (
    near &&
    next.tandemRole === 'none' &&
    next.phase === 'walking' &&
    remote.tandemRole === 'pilot' &&
    isOnGlider(remote.phase)
  ) {
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

  return { flight: next, parked: parkedOut, followPilot: false }
}

export function canOfferTandem(local: FlightState, remote: FlightState | null): boolean {
  if (!remote) return false
  if (local.tandemRole !== 'none') return true // leave
  if (local.phase === 'freefall' || local.phase === 'parachuting') return false
  if (remote.phase === 'freefall' || remote.phase === 'parachuting') return false
  return horizontalDist(local.position, remote.position) <= TANDEM_RANGE
}

export function tandemButtonLabel(local: FlightState, remote: FlightState | null): string {
  if (local.tandemRole === 'pilot') return 'Leave tandem'
  if (local.tandemRole === 'passenger') return 'Hop off'
  if (!remote) return 'Tandem'
  if (remote.tandemRole === 'pilot' || isOnGlider(remote.phase)) return 'Board tandem'
  if (isOnGlider(local.phase)) return 'Invite tandem'
  return 'Fly tandem'
}
