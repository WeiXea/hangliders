import type {
  BiomeConfig,
  FlightState,
  InputState,
  ParkedGlider,
} from '../types/game'
import {
  JUMP_MIN_ALTITUDE,
  MOUNT_RANGE,
  WALK_FEET,
} from '../types/game'
import {
  GROUND_CLEARANCE,
  GLIDER_REST_CLEARANCE,
  hitCityBuildings,
  hitWorldProps,
  resolvePropPush,
} from './obstacles'
import { resolveBuildingPush, sampleCitySupport, nearestEnterableDoor, clampInsideBuilding, getBuildingById, doorWorldPos } from './cityBuildings'
import { liftCoeff, groundEffectFactor } from './aero'
import { sampleAtmosphere } from './atmosphere'

const MAX_AIRSPEED = 32
const MIN_AIRSPEED = 7
const CRUISE = 12
const LIFTOFF_SPEED = 11
const STALL = 8.5
const BASE_SINK = 1.35
const PITCH_RATE = 1.55
const PITCH_TORQUE = 3.8
const ROLL_TORQUE = 4.4
const PITCH_DAMP = 2.6
const ROLL_DAMP = 3.1
const MAX_PITCH = 0.48
const MAX_ROLL = 0.7
const WALK_SPEED = 2.2
const WALK_SPRINT = 4.8
const GRAVITY = 22
const CHUTE_SINK = 3.6
const CHUTE_OPEN_SINK = 18
const FREEFALL_DRAG = 0.35
const CHUTE_INFLATE_TIME = 2.1
const SWING_STIFFNESS = 5.5
const SWING_DAMPING = 2.8
const MAX_SWING = 0.55
/** Body-centered airborne modes land when hips are about this above ground */
const BODY_LAND_CLEARANCE = 1.0

let swingVel = 0
/** Weight-shift angular rates (rad/s) — rigid-body lite */
let pitchVel = 0
let rollVel = 0
/** Low-pass vertical lift so thermal climb doesn't judder */
let smoothLift = 0

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
      y: groundY + GLIDER_REST_CLEARANCE,
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
    maxClimbRate: 0,
    timeInLift: 0,
    mountedId: -1,
    chuteDeployed: false,
    chuteInflation: 0,
    chuteSwing: 0,
    landAction: 'none',
    tandemRole: 'none',
    tandemWant: false,
    interiorId: -1,
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

function collideWorld(next: FlightState, config: BiomeConfig): FlightState {
  // Walking / ground roll use soft push — don't hard-crash into scenery
  if (
    next.phase === 'walking' ||
    next.phase === 'landed' ||
    next.phase === 'crashed' ||
    next.phase === 'grounded' ||
    next.phase === 'running'
  ) {
    return next
  }

  if (
    config.id === 'city' &&
    hitCityBuildings(next.position, config.getHeight, next.interiorId)
  ) {
    return {
      ...next,
      phase: 'crashed',
      airspeed: 0,
      velocity: { x: 0, y: 0, z: 0 },
    }
  }

  if (hitWorldProps(config.id, next.position, config.getHeight)) {
    return {
      ...next,
      phase: 'crashed',
      airspeed: 0,
      velocity: { x: 0, y: 0, z: 0 },
    }
  }

  return next
}

function supportY(
  config: BiomeConfig,
  x: number,
  z: number,
): { y: number; onRoof: boolean } {
  if (config.id !== 'city') {
    return { y: config.getHeight(x, z), onRoof: false }
  }
  const s = sampleCitySupport(x, z, config.getHeight)
  return { y: s.y, onRoof: s.onRoof }
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

function beginLanded(next: FlightState, config: BiomeConfig): FlightState {
  const groundY = config.getHeight(next.position.x, next.position.z)
  return {
    ...next,
    phase: 'landed',
    position: {
      ...next.position,
      y: groundY + WALK_FEET,
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
    tandemRole: 'none',
    tandemWant: false,
    stallWarning: false,
    interiorId: -1,
  }
}

function beginWalking(next: FlightState, config: BiomeConfig): FlightState {
  const support = supportY(config, next.position.x, next.position.z)
  return {
    ...next,
    phase: 'walking',
    position: {
      ...next.position,
      y: support.y + WALK_FEET,
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
    tandemRole: 'none',
    tandemWant: false,
    stallWarning: false,
    interiorId: -1,
  }
}

export function findNearestGlider(
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
  let support = supportY(config, next.position.x, next.position.z)
  let groundY = support.y
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
    } else if (input.emoteHug) {
      next.landAction = next.landAction === 'hug' ? 'none' : 'hug'
    } else if (input.emoteHighFive) {
      next.landAction = next.landAction === 'highfive' ? 'none' : 'highfive'
    }

    if (input.bankLeft) next.yaw += 2.2 * dt
    if (input.bankRight) next.yaw -= 2.2 * dt

    let move = 0
    // W / ↑ = pitchDown in flight maps → walk forward
    if (input.pitchDown || input.speedUp) move += 1
    if (input.pitchUp) move -= 1

    // Moving cancels sit / social holds
    if (move !== 0 && (next.landAction === 'sit' || next.landAction === 'hug' || next.landAction === 'highfive')) {
      next.landAction = 'none'
    }
    if (next.landAction === 'sit' || next.landAction === 'hug' || next.landAction === 'highfive') {
      move = 0
    }

    const speedMul =
      next.landAction === 'dance' || next.landAction === 'wave' ? 0.55 : 1
    const speed = (input.speedUp ? WALK_SPRINT : WALK_SPEED) * speedMul
    support = supportY(config, next.position.x, next.position.z)
    groundY =
      next.interiorId >= 0
        ? config.getHeight(next.position.x, next.position.z) + 0.15
        : support.y
    const onGround = next.position.y <= groundY + WALK_FEET + 0.08

    if (onGround) {
      next.velocity.y = 0
      next.position.y = groundY + WALK_FEET
      if (input.jump && next.landAction !== 'sit' && next.interiorId < 0) {
        next.velocity.y = 8.5
        if (
          next.landAction === 'wave' ||
          next.landAction === 'dance' ||
          next.landAction === 'hug' ||
          next.landAction === 'highfive'
        ) {
          next.landAction = 'none'
        }
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

    // Enter / leave buildings
    if (input.interact && config.id === 'city') {
      if (next.interiorId >= 0) {
        const b = getBuildingById(next.interiorId)
        if (b) {
          const door = doorWorldPos(b, config.getHeight)
          next.interiorId = -1
          next.position.x = door.x
          next.position.z = door.z + 1.2
          next.position.y = config.getHeight(door.x, door.z) + WALK_FEET
        }
      } else {
        const doorB = nearestEnterableDoor(next.position.x, next.position.z, config.getHeight)
        if (doorB && !findNearestGlider(next.position.x, next.position.z, parked)) {
          next.interiorId = doorB.id
          next.position.x = doorB.x
          next.position.z = doorB.z
          next.position.y = config.getHeight(doorB.x, doorB.z) + 0.15 + WALK_FEET
          next.landAction = 'none'
        }
      }
    }

    if (next.interiorId >= 0) {
      const b = getBuildingById(next.interiorId)
      if (b) {
        const clamped = clampInsideBuilding(next.position.x, next.position.z, b)
        next.position.x = clamped.x
        next.position.z = clamped.z
        groundY = config.getHeight(b.x, b.z) + 0.15
      }
    } else {
      if (config.id === 'city') {
        const pushed = resolveBuildingPush(next.position, config.getHeight, 0.35, next.interiorId)
        next.position.x = pushed.x
        next.position.z = pushed.z
      }
      const props = resolvePropPush(config.id, next.position, config.getHeight, 0.42)
      next.position.x = props.x
      next.position.z = props.z
      support = supportY(config, next.position.x, next.position.z)
      groundY = support.y
    }

    if (next.position.y < groundY + WALK_FEET) {
      next.position.y = groundY + WALK_FEET
      next.velocity.y = 0
    }
    next.altitude = 0
    next.airspeed = Math.hypot(next.velocity.x, next.velocity.z)
    next.distance += next.airspeed * dt

    if (input.interact && next.interiorId < 0) {
      const target = findNearestGlider(next.position.x, next.position.z, parked)
      if (target) {
        parked = parked.map((g) =>
          g.id === target.id ? { ...g, available: false } : g,
        )
        const gy = config.getHeight(target.x, target.z)
        next = {
          ...next,
          phase: 'grounded',
          position: { x: target.x, y: gy + GLIDER_REST_CLEARANCE, z: target.z },
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
          interiorId: -1,
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

    support = supportY(config, next.position.x, next.position.z)
    groundY = support.y
    next.altitude = Math.max(0, next.position.y - groundY)
    next.maxAltitude = Math.max(next.maxAltitude, next.altitude)
    next.distance += Math.hypot(next.velocity.x, next.velocity.z) * dt

    if (next.position.y <= groundY + BODY_LAND_CLEARANCE) {
      const sink = Math.abs(Math.min(0, next.velocity.y))
      if (sink > 12) {
        next.phase = 'crashed'
        next.airspeed = 0
        next.velocity = { x: 0, y: 0, z: 0 }
        next.position.y = groundY + WALK_FEET
      } else {
        next = beginWalking(next, config)
      }
    }

    return { flight: collideWorld(next, config), parked }
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

    const wind = sampleAtmosphere(config, time, next.position)
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

    support = supportY(config, next.position.x, next.position.z)
    groundY = support.y
    next.altitude = Math.max(0, next.position.y - groundY)
    next.distance += next.airspeed * dt

    if (next.position.y <= groundY + BODY_LAND_CLEARANCE) {
      const sink = Math.abs(Math.min(0, next.velocity.y))
      const soft = open > 0.75 && (flare > 0 || sink < 5.5)
      if (!soft && sink > 9) {
        next.phase = 'crashed'
        next.airspeed = 0
        next.velocity = { x: 0, y: 0, z: 0 }
        next.position.y = groundY + WALK_FEET
      } else {
        next = beginWalking(next, config)
      }
    }

    return { flight: collideWorld(next, config), parked }
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
    next.position.y = groundY + GLIDER_REST_CLEARANCE
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
      next.pitch = 0.16
      pitchVel = 0.15
      rollVel = 0
      next.velocity = {
        x: Math.sin(next.yaw) * next.airspeed,
        y: 2.8,
        z: Math.cos(next.yaw) * next.airspeed,
      }
      next.position.y = groundY + GROUND_CLEARANCE + 2.2
      next.altitude = 2.2
      next.airtime = 0
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
    next.tandemRole = 'none'
    next.tandemWant = false
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

  // Weight-shift lite: input applies torque; rates damp toward trim
  const pitchCmd = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0)
  const rollCmd = (input.bankLeft ? 1 : 0) - (input.bankRight ? 1 : 0)
  // Slight nose-up trim so hands-off / gentle ↑ floats instead of diving
  const trimPitch = input.pitchUp ? 0.12 : input.pitchDown ? -0.08 : 0.02
  const pitchSpring = input.pitchUp ? 2.2 : 1.4
  pitchVel +=
    (pitchCmd * PITCH_TORQUE * 0.85 - (next.pitch - trimPitch) * pitchSpring - pitchVel * (PITCH_DAMP + 0.8)) *
    dt
  rollVel += (rollCmd * ROLL_TORQUE - next.roll * 1.35 - rollVel * (ROLL_DAMP + 0.4)) * dt
  pitchVel = Math.max(-1.6, Math.min(1.6, pitchVel))
  rollVel = Math.max(-2.2, Math.min(2.2, rollVel))
  next.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, next.pitch + pitchVel * dt))
  next.roll = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, next.roll + rollVel * dt))

  // Speed bar: hold a floatable cruise band when not accelerating.
  // Nose-up must NOT bleed into stall — that's what made climb without speed unstable.
  const FLOAT_SPEED = 10.5
  if (input.speedUp) {
    next.airspeed = Math.min(MAX_AIRSPEED, next.airspeed + 10 * dt)
  } else if (input.speedDown) {
    next.airspeed = Math.max(MIN_AIRSPEED, next.airspeed - 10 * dt)
  } else if (input.pitchUp) {
    // Cruise / float: settle near best-glide, stay well above stall
    const target = Math.max(FLOAT_SPEED, CRUISE - 1.2)
    next.airspeed += (target - next.airspeed) * Math.min(1, 1.6 * dt)
  } else {
    const pitchBleed = Math.max(-2.5, Math.min(2.5, next.pitch * 4))
    const target = Math.min(
      MAX_AIRSPEED,
      Math.max(FLOAT_SPEED, CRUISE - pitchBleed),
    )
    next.airspeed += (target - next.airspeed) * Math.min(1, 1.5 * dt)
  }

  const wind = sampleAtmosphere(config, time, next.position)
  next.yaw += next.roll * 0.85 * dt

  // AoA ≈ pitch vs flight path — flavors sink / deep-stall only (speed stays arcade)
  const pathPitch = Math.asin(
    Math.max(-1, Math.min(1, next.velocity.y / Math.max(8, next.airspeed))),
  )
  const aoa = next.pitch - pathPitch + 0.08
  const { cl, stallSeverity } = liftCoeff(aoa)
  const speedStall = next.airspeed < STALL
  const aoaStall = stallSeverity > 0.55 && !input.pitchUp
  next.stallWarning = speedStall || aoaStall

  const speed = next.airspeed
  const fx = Math.sin(next.yaw) * Math.cos(next.pitch)
  const fz = Math.cos(next.yaw) * Math.cos(next.pitch)

  // Smooth thermal / ridge lift so climb doesn't telegraph as shake
  const liftK = 1 - Math.exp(-3.2 * dt)
  smoothLift += (wind.y - smoothLift) * liftK

  // Base sink ~1.35 m/s; better Cl → slightly less sink; thermals/ridge via smoothed lift
  const ldSink = BASE_SINK * (1.12 - Math.min(0.3, cl * 0.2))
  const ge = groundEffectFactor(next.altitude)
  let vy = next.pitch * speed * 0.85 - ldSink * ge + smoothLift

  if (input.pitchDown) {
    vy -= 4.5 + Math.abs(next.pitch) * 6
  } else if (input.pitchUp) {
    // Gentle sustained climb / float — not a kick that overshoots then stalls
    const thermalHelp = Math.max(0, smoothLift) * 0.35
    vy += 1.4 + next.pitch * 1.8 + thermalHelp
    // Cap climb so float feels stable instead of yo-yo
    vy = Math.min(vy, 4.5 + Math.max(0, smoothLift) * 0.6)
  } else {
    // Hands-off cruise: near-level float with mild sink unless in lift
    vy = lerp(vy, -0.55 + smoothLift * 0.9, 0.35)
  }

  if (speedStall && !input.pitchUp) vy -= 5
  else if (aoaStall) vy -= 2 + stallSeverity * 2

  next.velocity.x = fx * speed + wind.x * 0.55
  next.velocity.y = vy
  next.velocity.z = fz * speed + wind.z * 0.55

  // Track climb / time in lift for results + challenge score
  if (next.velocity.y > next.maxClimbRate) {
    next.maxClimbRate = next.velocity.y
  }
  const airLift = smoothLift
  if (airLift > 0.35 || next.velocity.y > 0.55) {
    next.timeInLift += dt
  }

  // Wing-drop only in deep unintended stall — not while holding float/climb
  if (aoaStall && stallSeverity > 0.75) {
    next.roll += (Math.sin(time * 2.2) > 0 ? 1 : -1) * stallSeverity * 0.2 * dt
    next.roll = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, next.roll))
  }

  next.position.x += next.velocity.x * dt
  next.position.y += next.velocity.y * dt
  next.position.z += next.velocity.z * dt

  support = supportY(config, next.position.x, next.position.z)
  groundY = support.y
  next.altitude = Math.max(0, next.position.y - groundY)
  next.maxAltitude = Math.max(next.maxAltitude, next.altitude)
  next.distance += Math.hypot(next.velocity.x, next.velocity.z) * dt

  next = collideWorld(next, config)
  if (next.phase === 'crashed') return { flight: next, parked }

  // Touchdown while still on glider → bounce to run (stay mounted) unless
  // a real soft landing / intentional land. Auto-walk was unmounting on every
  // post-takeoff scrape.
  if (next.position.y <= groundY + GROUND_CLEARANCE) {
    next.position.y = groundY + GROUND_CLEARANCE
    const sink = Math.abs(Math.min(0, next.velocity.y))
    const flaring = input.pitchUp && next.altitude < 18
    const crawl = next.airspeed <= (flaring ? 8.5 : 6.5)
    const gentle = sink <= (flaring ? 8.5 : 6.5) && next.pitch > -0.35
    const steadyDescent = next.velocity.y <= 0.5 && next.velocity.y >= -7
    const takeoffGrace = next.airtime < 2.2
    const softLand = crawl && gentle && steadyDescent && !takeoffGrace
    const intentional =
      input.land && next.airspeed <= 12 && sink < 10 && !takeoffGrace

    if (intentional) {
      parked = parkMountedGlider(next, parked)
      next = beginLanded(next, config)
    } else if (softLand) {
      parked = parkMountedGlider(next, parked)
      next = beginWalking(next, config)
    } else if (sink > 11 || next.airspeed > 24 || next.pitch < -0.45) {
      next.phase = 'crashed'
      next.airspeed = 0
      next.velocity = { x: 0, y: 0, z: 0 }
    } else {
      next.phase = 'running'
      next.airspeed = Math.max(next.airspeed, 8)
      next.velocity.y = 0
      next.velocity.x = Math.sin(next.yaw) * next.airspeed
      next.velocity.z = Math.cos(next.yaw) * next.airspeed
      next.position.y = groundY + GLIDER_REST_CLEARANCE
      next.pitch = Math.min(next.pitch, 0.08)
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
  if (state.phase === 'landed') return 'perfect'
  if (state.phase === 'walking' && state.airtime > 4) return 'good'
  return null
}
