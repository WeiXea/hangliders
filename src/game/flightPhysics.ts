import type {
  BiomeConfig,
  FlightState,
  InputState,
  ParkedGlider,
} from '../types/game'
import {
  JUMP_MIN_ALTITUDE,
  MOUNT_RANGE,
  WALK_EYE,
} from '../types/game'
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
const WALK_SPEED = 7.5
const WALK_SPRINT = 11
const GRAVITY = 22
const CHUTE_SINK = 3.6
const CHUTE_OPEN_SINK = 18
const FREEFALL_DRAG = 0.35
const CHUTE_INFLATE_TIME = 2.1
const SWING_STIFFNESS = 5.5
const SWING_DAMPING = 2.8
const MAX_SWING = 0.55

let swingVel = 0

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export interface TickResult {
  flight: FlightState
  parked: ParkedGlider[]
}

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
    mountedId: -1,
    chuteDeployed: false,
    chuteInflation: 0,
    chuteSwing: 0,
    landAction: 'none',
  }
}

export function initParkedGliders(config: BiomeConfig): ParkedGlider[] {
  return config.parkedGliders.map((g, i) => ({
    id: i,
    x: g.x,
    z: g.z,
    yaw: g.yaw,
    available: true,
  }))
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
  if (next.phase === 'walking' || next.phase === 'freefall' || next.phase === 'parachuting') {
    return next
  }
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

function parkMountedGlider(
  flight: FlightState,
  parked: ParkedGlider[],
): ParkedGlider[] {
  const x = flight.position.x
  const z = flight.position.z
  const yaw = flight.yaw

  if (flight.mountedId >= 0) {
    return parked.map((g) =>
      g.id === flight.mountedId
        ? { ...g, x, z, yaw, available: true }
        : g,
    )
  }

  const nextId = parked.reduce((m, g) => Math.max(m, g.id), -1) + 1
  return [...parked, { id: nextId, x, z, yaw, available: true }]
}

function beginWalking(next: FlightState, config: BiomeConfig): FlightState {
  const groundY = config.getHeight(next.position.x, next.position.z)
  return {
    ...next,
    phase: 'walking',
    position: {
      ...next.position,
      y: groundY + WALK_EYE,
    },
    velocity: { x: 0, y: 0, z: 0 },
    airspeed: 0,
    pitch: 0,
    roll: 0,
    altitude: 0,
    mountedId: -1,
    chuteDeployed: false,
    chuteInflation: 0,
    chuteSwing: 0,
    landAction: 'none',
    stallWarning: false,
  }
}

function findNearestGlider(
  x: number,
  z: number,
  parked: ParkedGlider[],
): ParkedGlider | null {
  let best: ParkedGlider | null = null
  let bestDist = MOUNT_RANGE
  for (const g of parked) {
    if (!g.available) continue
    const d = Math.hypot(g.x - x, g.z - z)
    if (d < bestDist) {
      bestDist = d
      best = g
    }
  }
  return best
}

export function nearestMountable(
  flight: FlightState,
  parked: ParkedGlider[],
): ParkedGlider | null {
  if (flight.phase !== 'walking') return null
  return findNearestGlider(flight.position.x, flight.position.z, parked)
}

/**
 * Takeoff: build speed (Shift / +) on the ground, then climb (↓) to lift off.
 * Jump: leave glider above JUMP_MIN_ALTITUDE, then deploy chute.
 * Soft land / chute land → walk; find parked gliders to remount.
 */
export function tickFlight(
  state: FlightState,
  input: InputState,
  config: BiomeConfig,
  dt: number,
  time: number,
  parkedIn: ParkedGlider[],
): TickResult {
  let next = { ...state, position: { ...state.position }, velocity: { ...state.velocity } }
  let parked = parkedIn
  let groundY = config.getHeight(next.position.x, next.position.z)
  next.altitude = Math.max(0, next.position.y - groundY)

  if (next.phase === 'landed' || next.phase === 'crashed') {
    return { flight: next, parked }
  }

  // --- Walking ---
  if (next.phase === 'walking') {
    if (input.emoteWave) {
      next.landAction = next.landAction === 'wave' ? 'none' : 'wave'
    } else if (input.emoteDance) {
      next.landAction = next.landAction === 'dance' ? 'none' : 'dance'
    } else if (input.emoteSit) {
      next.landAction = next.landAction === 'sit' ? 'none' : 'sit'
    }

    if (input.bankLeft) next.yaw += 2.2 * dt
    if (input.bankRight) next.yaw -= 2.2 * dt

    let move = 0
    // W / ↑ = pitchDown in flight maps → walk forward
    if (input.pitchDown || input.speedUp) move += 1
    if (input.pitchUp) move -= 1

    // Moving cancels sit; dance/wave can continue while walking slowly
    if (move !== 0 && next.landAction === 'sit') next.landAction = 'none'
    if (next.landAction === 'sit') move = 0

    const speedMul = next.landAction === 'dance' || next.landAction === 'wave' ? 0.55 : 1
    const speed = (input.speedUp ? WALK_SPRINT : WALK_SPEED) * speedMul
    const onGround = next.position.y <= groundY + WALK_EYE + 0.05

    if (onGround) {
      next.velocity.y = 0
      next.position.y = groundY + WALK_EYE
      if (input.jump && next.landAction !== 'sit') {
        next.velocity.y = 8.5
        if (next.landAction === 'wave' || next.landAction === 'dance') next.landAction = 'none'
      }
    } else {
      next.velocity.y -= GRAVITY * dt
    }

    const fx = Math.sin(next.yaw)
    const fz = Math.cos(next.yaw)
    next.velocity.x = fx * move * speed
    next.velocity.z = fz * move * speed
    next.position.x += next.velocity.x * dt
    next.position.z += next.velocity.z * dt
    next.position.y += next.velocity.y * dt

    groundY = config.getHeight(next.position.x, next.position.z)
    if (next.position.y < groundY + WALK_EYE) {
      next.position.y = groundY + WALK_EYE
      next.velocity.y = 0
    }
    next.altitude = 0
    next.airspeed = Math.hypot(next.velocity.x, next.velocity.z)
    next.distance += next.airspeed * dt

    if (input.interact) {
      const target = findNearestGlider(next.position.x, next.position.z, parked)
      if (target) {
        parked = parked.map((g) =>
          g.id === target.id ? { ...g, available: false } : g,
        )
        const gy = config.getHeight(target.x, target.z)
        next = {
          ...next,
          phase: 'grounded',
          position: { x: target.x, y: gy + GROUND_CLEARANCE, z: target.z },
          yaw: target.yaw,
          pitch: 0,
          roll: 0,
          airspeed: 0,
          velocity: { x: 0, y: 0, z: 0 },
          altitude: 0,
          mountedId: target.id,
          chuteDeployed: false,
          chuteInflation: 0,
          chuteSwing: 0,
          landAction: 'none',
        }
      }
    }

    return { flight: next, parked }
  }

  // --- Freefall ---
  if (next.phase === 'freefall') {
    next.airtime += dt

    if (input.deployChute) {
      next.phase = 'parachuting'
      next.chuteDeployed = true
      next.chuteInflation = 0.05
      next.chuteSwing = next.roll * 0.4
      swingVel = next.roll * 0.5
      return { flight: next, parked }
    }

    if (input.bankLeft) next.yaw += 1.4 * dt
    if (input.bankRight) next.yaw -= 1.4 * dt
    next.roll = input.bankLeft ? 0.35 : input.bankRight ? -0.35 : next.roll * (1 - 3 * dt)
    next.pitch = Math.min(0.6, next.pitch + 0.4 * dt)

    next.velocity.y -= GRAVITY * 0.85 * dt
    next.velocity.y *= 1 - FREEFALL_DRAG * dt
    const drift = 6
    next.velocity.x = Math.sin(next.yaw) * drift + next.velocity.x * 0.92
    next.velocity.z = Math.cos(next.yaw) * drift + next.velocity.z * 0.92
    next.airspeed = Math.hypot(next.velocity.x, next.velocity.y, next.velocity.z)

    next.position.x += next.velocity.x * dt
    next.position.y += next.velocity.y * dt
    next.position.z += next.velocity.z * dt

    groundY = config.getHeight(next.position.x, next.position.z)
    next.altitude = Math.max(0, next.position.y - groundY)
    next.maxAltitude = Math.max(next.maxAltitude, next.altitude)
    next.distance += Math.hypot(next.velocity.x, next.velocity.z) * dt

    if (next.position.y <= groundY + WALK_EYE) {
      const sink = Math.abs(Math.min(0, next.velocity.y))
      if (sink > 12) {
        next.phase = 'crashed'
        next.airspeed = 0
        next.velocity = { x: 0, y: 0, z: 0 }
        next.position.y = groundY + WALK_EYE
      } else {
        next = beginWalking(next, config)
      }
    }

    return { flight: next, parked }
  }

  // --- Parachuting ---
  if (next.phase === 'parachuting') {
    next.airtime += dt
    next.chuteDeployed = true

    // Gradual canopy inflation
    next.chuteInflation = Math.min(1, next.chuteInflation + dt / CHUTE_INFLATE_TIME)
    const open = smoothstep(next.chuteInflation)
    const opening = open < 0.98

    // Toggle steering + pendulum swing
    let steer = 0
    if (input.bankLeft) steer += 1
    if (input.bankRight) steer -= 1
    if (steer !== 0) {
      next.yaw += steer * (0.55 + open * 0.7) * dt
    }

    const wind = windBump(config, time, next.position.x)
    const targetSwing = steer * 0.38 * open + Math.sin(time * 0.9) * 0.04 * open
    const swingAccel =
      (targetSwing - next.chuteSwing) * SWING_STIFFNESS - swingVel * SWING_DAMPING
    swingVel += swingAccel * dt
    next.chuteSwing = Math.max(-MAX_SWING, Math.min(MAX_SWING, next.chuteSwing + swingVel * dt))
    next.roll = next.chuteSwing * 0.85

    // Forward drive from brakes / toggles
    const forward =
      (4.2 + (input.pitchDown ? 2.8 : 0) - (input.pitchUp ? 1.8 : 0)) * (0.35 + open * 0.65)
    next.velocity.x = Math.sin(next.yaw) * forward + wind.x * 0.6 + Math.cos(next.yaw) * next.chuteSwing * 3.5
    next.velocity.z = Math.cos(next.yaw) * forward + wind.z * 0.6 - Math.sin(next.yaw) * next.chuteSwing * 3.5

    // Sink rate: high while opening, settles to gentle descent; flare near ground
    const baseSink = lerp(CHUTE_OPEN_SINK, CHUTE_SINK, open * open)
    let flare = 0
    if (input.pitchUp && open > 0.55) flare = 1.8
    if (next.altitude < 14 && open > 0.7 && input.pitchUp) flare = 2.6
    const targetVy = -baseSink + flare + wind.y * 0.25
    next.velocity.y += (targetVy - next.velocity.y) * Math.min(1, (1.2 + open * 2.5) * dt)

    // Snatch when canopy bites
    if (opening && open > 0.35 && open < 0.7) {
      next.velocity.y *= 1 - 1.8 * dt
      next.velocity.x *= 1 - 0.8 * dt
      next.velocity.z *= 1 - 0.8 * dt
    }

    next.airspeed = Math.hypot(next.velocity.x, next.velocity.z)
    next.pitch = -0.05 - (1 - open) * 0.25 + (flare > 0 ? 0.12 : 0)

    next.position.x += next.velocity.x * dt
    next.position.y += next.velocity.y * dt
    next.position.z += next.velocity.z * dt

    groundY = config.getHeight(next.position.x, next.position.z)
    next.altitude = Math.max(0, next.position.y - groundY)
    next.distance += next.airspeed * dt

    if (next.position.y <= groundY + WALK_EYE) {
      const sink = Math.abs(Math.min(0, next.velocity.y))
      const soft = open > 0.75 && (flare > 0 || sink < 5.5)
      if (!soft && sink > 9) {
        next.phase = 'crashed'
        next.airspeed = 0
        next.velocity = { x: 0, y: 0, z: 0 }
        next.position.y = groundY + WALK_EYE
      } else {
        next = beginWalking(next, config)
      }
    }

    return { flight: next, parked }
  }

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

    return { flight: collideWorld(next, config), parked }
  }

  // --- Airborne hang gliding ---
  next.airtime += dt

  if (input.jump && next.altitude >= JUMP_MIN_ALTITUDE) {
    parked = parkMountedGlider(next, parked)
    next.phase = 'freefall'
    next.mountedId = -1
    next.chuteDeployed = false
    next.chuteInflation = 0
    next.chuteSwing = 0
    swingVel = 0
    next.airspeed = Math.max(8, next.airspeed * 0.55)
    next.velocity.y = Math.min(next.velocity.y, -2)
    next.pitch = 0.25
    next.roll = 0
    return { flight: next, parked }
  }

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
  if (next.phase === 'crashed') return { flight: next, parked }

  // Touchdown while still on glider → walk (soft) or crash / bounce
  if (next.position.y <= groundY + GROUND_CLEARANCE) {
    next.position.y = groundY + GROUND_CLEARANCE
    const sink = Math.abs(Math.min(0, next.velocity.y))
    const slow = next.airspeed <= 14
    const gentle = sink <= 6.5 && next.pitch > -0.35
    const steadyDescent = next.velocity.y <= 0.5 && next.velocity.y >= -7

    if ((slow && gentle && steadyDescent) || (input.land && slow && sink < 10)) {
      parked = parkMountedGlider(next, parked)
      next = beginWalking(next, config)
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

  return { flight: next, parked }
}

export function getLandingQuality(
  state: FlightState,
): 'perfect' | 'good' | 'hard' | 'crash' | null {
  if (state.phase === 'crashed') return 'crash'
  if (state.phase !== 'landed') return null
  if (state.airspeed === 0) return 'perfect'
  return 'good'
}
