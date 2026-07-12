import type { BiomeConfig, FlightState, InputState } from '../types/game'
import {
  GROUND_CLEARANCE,
  getObstacles,
  hitObstacle,
} from './obstacles'

const MIN_AIRSPEED = 7
const MAX_AIRSPEED = 30
const CRUISE = 15
const LIFTOFF_SPEED = 13
const STALL = 9
const PITCH_RATE = 1.8
const ROLL_RATE = 2.2
const MAX_PITCH = 0.5
const MAX_ROLL = 0.65
const BASE_SINK = 2.2

export function createInitialFlight(config: BiomeConfig): FlightState {
  const groundY = config.getHeight(config.launchPosition.x, config.launchPosition.z)
  return {
    position: {
      x: config.launchPosition.x,
      y: groundY + GROUND_CLEARANCE,
      z: config.launchPosition.z,
    },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 0,
    roll: 0,
    yaw: config.launchYaw,
    airspeed: 0,
    phase: 'grounded',
    runProgress: 0,
    stallWarning: false,
    altitude: 0,
    distance: 0,
    maxAltitude: 0,
    airtime: 0,
  }
}

function windBump(config: BiomeConfig, time: number, x: number) {
  return {
    x: Math.sin(time * 0.3) * config.windStrength,
    y:
      config.thermalStrength *
      Math.max(0, Math.sin(time * 0.45 + x * 0.02) * 0.5 + 0.25) *
      1.1,
    z: Math.cos(time * 0.25) * config.windStrength * 0.55,
  }
}

function collideWorld(next: FlightState, config: BiomeConfig): FlightState {
  const obstacles = getObstacles(config.id)
  for (const ob of obstacles) {
    const gy = config.getHeight(ob.x, ob.z)
    if (hitObstacle(next.position, ob, gy)) {
      return {
        ...next,
        phase: 'crashed',
        airspeed: 0,
        velocity: { x: 0, y: 0, z: 0 },
      }
    }
  }
  return next
}

/**
 * Takeoff: build speed (Shift / +) on the ground, then climb (↓) to lift off.
 * Landing: touch down slow with a gentle sink.
 */
export function tickFlight(
  state: FlightState,
  input: InputState,
  config: BiomeConfig,
  dt: number,
  time: number,
): FlightState {
  let next = { ...state, position: { ...state.position }, velocity: { ...state.velocity } }
  let groundY = config.getHeight(next.position.x, next.position.z)
  next.altitude = Math.max(0, next.position.y - groundY)

  if (next.phase === 'landed' || next.phase === 'crashed') return next

  // --- Ground roll / takeoff ---
  if (next.phase === 'grounded' || next.phase === 'running') {
    next.phase = 'running'

    if (input.speedUp || input.takeOff) {
      next.airspeed = Math.min(MAX_AIRSPEED, next.airspeed + 14 * dt)
    } else if (input.speedDown) {
      next.airspeed = Math.max(0, next.airspeed - 16 * dt)
    } else {
      next.airspeed = Math.max(0, next.airspeed - 4 * dt)
    }

    if (input.pitchUp) next.pitch = Math.min(0.35, next.pitch + PITCH_RATE * dt)
    else if (input.pitchDown) next.pitch = Math.max(-0.15, next.pitch - PITCH_RATE * 0.6 * dt)
    else next.pitch *= 1 - Math.min(1, 3 * dt)

    if (input.bankLeft) next.yaw += 0.55 * dt
    if (input.bankRight) next.yaw -= 0.55 * dt

    const spd = next.airspeed
    next.position.x += Math.sin(next.yaw) * spd * dt
    next.position.z += Math.cos(next.yaw) * spd * dt
    groundY = config.getHeight(next.position.x, next.position.z)
    next.position.y = groundY + GROUND_CLEARANCE
    next.altitude = 0
    next.roll = 0
    next.distance += spd * dt
    next.velocity = {
      x: Math.sin(next.yaw) * spd,
      y: 0,
      z: Math.cos(next.yaw) * spd,
    }

    const wantsLift = input.pitchUp || input.takeOff
    if (spd >= LIFTOFF_SPEED && wantsLift) {
      next.phase = 'flying'
      next.airspeed = Math.max(spd, CRUISE)
      next.pitch = 0.18
      next.velocity.y = 3.5
      next.position.y = groundY + GROUND_CLEARANCE + 1.2
      next.altitude = 1.2
    }

    if (spd < 0.5 && !input.speedUp && !input.takeOff) {
      next.phase = 'grounded'
      next.airspeed = 0
      next.pitch = 0
    }

    return collideWorld(next, config)
  }

  // --- Airborne ---
  next.airtime += dt

  if (input.pitchUp) next.pitch = Math.min(MAX_PITCH, next.pitch + PITCH_RATE * dt)
  if (input.pitchDown) next.pitch = Math.max(-MAX_PITCH, next.pitch - PITCH_RATE * dt)
  if (input.bankLeft) next.roll = Math.min(MAX_ROLL, next.roll + ROLL_RATE * dt)
  if (input.bankRight) next.roll = Math.max(-MAX_ROLL, next.roll - ROLL_RATE * dt)

  if (!input.bankLeft && !input.bankRight) next.roll *= 1 - Math.min(1, 2.8 * dt)
  if (!input.pitchUp && !input.pitchDown) {
    next.pitch += (-0.05 - next.pitch) * Math.min(1, 1.1 * dt)
  }

  if (input.speedUp) next.airspeed = Math.min(MAX_AIRSPEED, next.airspeed + 10 * dt)
  else if (input.speedDown) next.airspeed = Math.max(MIN_AIRSPEED, next.airspeed - 10 * dt)
  else {
    const target = Math.min(MAX_AIRSPEED, Math.max(MIN_AIRSPEED, CRUISE - next.pitch * 10))
    next.airspeed += (target - next.airspeed) * Math.min(1, 2.2 * dt)
  }

  next.stallWarning = next.airspeed < STALL
  const w = windBump(config, time, next.position.x)
  next.yaw += next.roll * 1.05 * dt

  const speed = next.airspeed
  const fx = Math.sin(next.yaw) * Math.cos(next.pitch)
  const fz = Math.cos(next.yaw) * Math.cos(next.pitch)

  let vy = next.pitch * speed * 1.05 - BASE_SINK + w.y
  if (input.pitchDown) vy -= 5 + Math.abs(next.pitch) * 8
  if (input.pitchUp) vy += 3.2 + next.pitch * 4
  if (next.stallWarning) vy -= 7

  next.velocity.x = fx * speed + w.x
  next.velocity.y = vy
  next.velocity.z = fz * speed + w.z

  next.position.x += next.velocity.x * dt
  next.position.y += next.velocity.y * dt
  next.position.z += next.velocity.z * dt

  groundY = config.getHeight(next.position.x, next.position.z)
  next.altitude = Math.max(0, next.position.y - groundY)
  next.maxAltitude = Math.max(next.maxAltitude, next.altitude)
  next.distance += Math.hypot(next.velocity.x, next.velocity.z) * dt

  next = collideWorld(next, config)
  if (next.phase === 'crashed') return next

  // Touchdown
  if (next.position.y <= groundY + GROUND_CLEARANCE) {
    next.position.y = groundY + GROUND_CLEARANCE
    const sink = Math.abs(Math.min(0, next.velocity.y))
    const slow = next.airspeed <= 14
    const gentle = sink <= 6.5 && next.pitch > -0.35
    const steadyDescent = next.velocity.y <= 0.5 && next.velocity.y >= -7

    if ((slow && gentle && steadyDescent) || (input.land && slow && sink < 10)) {
      next.phase = 'landed'
      next.airspeed = 0
      next.velocity = { x: 0, y: 0, z: 0 }
      next.pitch = 0
      next.roll = 0
      next.altitude = 0
    } else if (sink > 9 || next.airspeed > 20 || next.pitch < -0.4) {
      next.phase = 'crashed'
      next.airspeed = 0
      next.velocity = { x: 0, y: 0, z: 0 }
    } else {
      next.phase = 'running'
      next.airspeed = Math.min(next.airspeed, 12)
      next.velocity.y = 0
      next.pitch = 0
      next.roll = 0
      next.altitude = 0
    }
  }

  return next
}

export function getLandingQuality(
  state: FlightState,
): 'perfect' | 'good' | 'hard' | 'crash' | null {
  if (state.phase === 'crashed') return 'crash'
  if (state.phase !== 'landed') return null
  if (state.airspeed === 0) return 'perfect'
  return 'good'
}
