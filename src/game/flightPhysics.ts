import type {
  BiomeConfig,
  FlightState,
  InputState,
  ParkedGlider,
} from '../types/game'
import {
  JUMP_MIN_ALTITUDE,
  MOUNT_RANGE,
  VEHICLE_BOARD_RANGE,
  WALK_FEET,
} from '../types/game'
import type { VehicleKind } from '../types/game'
import {
  GROUND_CLEARANCE,
  GLIDER_REST_CLEARANCE,
  HELI_REST_CLEARANCE,
  hitCityBuildings,
  hitWorldProps,
  resolvePropPush,
} from './obstacles'
import { resolveBuildingPush, sampleCitySupport, nearestEnterableDoor, clampInsideBuilding, getBuildingById, doorWorldPos, nearestElevatorBuilding, elevatorStreetPos, elevatorRoofPos } from './cityBuildings'
import {
  nearestTrafficVehicle,
  setTakenVehicleId,
  vehicleMaxSpeed,
  vehicleRestClearance,
  vehicleAccel,
  vehicleBrake,
  resolveDriveCollisions,
} from './trafficRegistry'
import { playCrashImpact, playWhoosh } from './audio'
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
const WALK_SPEED = 4.2
const WALK_SPRINT = 8.8
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
/** Cooldown so car impacts don't spam crash audio */
let lastCarCrashAt = 0
/** Skip speed-killing collisions briefly after boarding */
let driveCollideGraceUntil = 0

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
    craftType: 'glider',
    vehicleId: -1,
    vehicleKind: null,
  }
}

export function initParkedGliders(config: BiomeConfig): ParkedGlider[] {
  return config.parkedGliders.map((g, i) => ({
    id: i,
    x: g.x,
    z: g.z,
    yaw: g.yaw,
    available: true,
    buildingId: g.buildingId,
    craftType: g.craftType ?? 'glider',
  }))
}

function collideWorld(next: FlightState, config: BiomeConfig): FlightState {
  // Walking / ground roll use soft push — don't hard-crash into scenery
  if (
    next.phase === 'walking' ||
    next.phase === 'landed' ||
    next.phase === 'crashed' ||
    next.phase === 'grounded' ||
    next.phase === 'running' ||
    next.phase === 'driving'
  ) {
    return next
  }

  if (
    config.id === 'city' &&
    hitCityBuildings(next.position, config.getHeight, next.interiorId, next.yaw)
  ) {
    return {
      ...next,
      phase: 'crashed',
      airspeed: 0,
      velocity: { x: 0, y: 0, z: 0 },
      // Wrecked attitude — crumpled against the facade
      pitch: -0.55,
      roll: next.roll >= 0 ? 1.15 : -1.15,
      chuteDeployed: false,
      chuteInflation: 0,
    }
  }

  if (hitWorldProps(config.id, next.position, config.getHeight)) {
    return {
      ...next,
      phase: 'crashed',
      airspeed: 0,
      velocity: { x: 0, y: 0, z: 0 },
      pitch: -0.4,
      roll: next.roll >= 0 ? 0.9 : -0.9,
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
  config?: BiomeConfig,
): ParkedGlider[] {
  const x = flight.position.x
  const z = flight.position.z
  const yaw = flight.yaw
  const craftType = flight.craftType ?? 'glider'
  let buildingId: number | undefined
  if (config?.id === 'city') {
    const support = sampleCitySupport(x, z, config.getHeight)
    if (support.onRoof) buildingId = support.buildingId
  }

  if (flight.mountedId >= 0) {
    return parked.map((g) =>
      g.id === flight.mountedId
        ? { ...g, x, z, yaw, available: true, buildingId, craftType }
        : g,
    )
  }

  const nextId = parked.reduce((m, g) => Math.max(m, g.id), -1) + 1
  return [...parked, { id: nextId, x, z, yaw, available: true, buildingId, craftType }]
}

function beginLanded(next: FlightState, config: BiomeConfig): FlightState {
  const groundY = supportY(config, next.position.x, next.position.z).y
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
    craftType: 'glider',
    vehicleId: -1,
    vehicleKind: null,
  }
}

function beginWalking(next: FlightState, config: BiomeConfig): FlightState {
  setTakenVehicleId(-1)
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
    craftType: 'glider',
    vehicleId: -1,
    vehicleKind: null,
  }
}

export function findNearestGlider(
  x: number,
  z: number,
  parked: ParkedGlider[],
  y?: number,
  supportAt?: (x: number, z: number) => number,
): ParkedGlider | null {
  let best: ParkedGlider | null = null
  let bestDist = MOUNT_RANGE
  for (const g of parked) {
    if (!g.available) continue
    if (y != null && supportAt) {
      if (Math.abs(y - supportAt(g.x, g.z)) > 4.5) continue
    }
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
  supportAt?: (x: number, z: number) => number,
): ParkedGlider | null {
  if (flight.phase !== 'walking') return null
  return findNearestGlider(
    flight.position.x,
    flight.position.z,
    parked,
    flight.position.y,
    supportAt,
  )
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

    // Enter / leave buildings, ride elevators, board traffic
    if (input.interact && config.id === 'city') {
      const roofBuildingIds = [
        ...new Set(
          parked
            .filter((g) => g.available && g.buildingId != null)
            .map((g) => g.buildingId!),
        ),
      ]
      const elev = nearestElevatorBuilding(
        next.position.x,
        next.position.z,
        next.position.y,
        roofBuildingIds,
        config.getHeight,
      )
      const nearGlider = findNearestGlider(
        next.position.x,
        next.position.z,
        parked,
        next.position.y,
        (gx, gz) => supportY(config, gx, gz).y,
      )
      const nearVeh = nearestTrafficVehicle(
        next.position.x,
        next.position.z,
        VEHICLE_BOARD_RANGE,
      )

      if (elev && !nearGlider && !nearVeh) {
        if (elev.toRoof) {
          const roof = elevatorRoofPos(elev.building, config.getHeight)
          next.position.x = roof.x
          next.position.z = roof.z
          next.position.y = roof.y + WALK_FEET
          next.interiorId = -1
          next.landAction = 'none'
        } else {
          const street = elevatorStreetPos(elev.building, config.getHeight)
          next.position.x = street.x
          next.position.z = street.z + 0.6
          next.position.y = street.y + WALK_FEET
          next.interiorId = -1
          next.landAction = 'none'
        }
      } else if (next.interiorId >= 0) {
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
        if (doorB && !nearGlider && !elev && !nearVeh) {
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
      const target = findNearestGlider(
        next.position.x,
        next.position.z,
        parked,
        next.position.y,
        (gx, gz) => supportY(config, gx, gz).y,
      )
      if (target) {
        parked = parked.map((g) =>
          g.id === target.id ? { ...g, available: false } : g,
        )
        const gy =
          config.id === 'city'
            ? sampleCitySupport(target.x, target.z, config.getHeight).y
            : config.getHeight(target.x, target.z)
        const craft = target.craftType ?? 'glider'
        if (craft === 'helicopter') {
          next = {
            ...next,
            phase: 'helicopter',
            craftType: 'helicopter',
            position: { x: target.x, y: gy + HELI_REST_CLEARANCE, z: target.z },
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
            stallWarning: false,
          }
        } else {
          next = {
            ...next,
            phase: 'grounded',
            craftType: 'glider',
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
      } else if (config.id === 'city') {
        const veh = nearestTrafficVehicle(
          next.position.x,
          next.position.z,
          VEHICLE_BOARD_RANGE,
        )
        if (veh) {
          setTakenVehicleId(veh.id)
          const kind = veh.kind as VehicleKind
          const gy = supportY(config, veh.x, veh.z).y
          driveCollideGraceUntil = performance.now() + 900
          next = {
            ...next,
            phase: 'driving',
            vehicleId: veh.id,
            vehicleKind: kind,
            position: {
              x: veh.x,
              y: gy + vehicleRestClearance(kind),
              z: veh.z,
            },
            yaw: veh.yaw,
            pitch: 0,
            roll: 0,
            airspeed: 0,
            velocity: { x: 0, y: 0, z: 0 },
            altitude: 0,
            mountedId: -1,
            landAction: 'none',
            interiorId: -1,
            stallWarning: false,
            craftType: 'glider',
          }
        }
      }
    }

    return { flight: next, parked }
  }

  // --- Driving city traffic ---
  if (next.phase === 'driving') {
    const kind = (next.vehicleKind ?? 'car') as VehicleKind
    const maxSpd = vehicleMaxSpeed(kind)
    const accel = vehicleAccel(kind) * 1.35
    const brake = vehicleBrake(kind)
    next.stallWarning = false

    // Speed-sensitive steering — snappy at crawl, heavier at speed
    const steerScale = 1.35 / (1 + Math.abs(next.airspeed) * 0.09)
    const steerInput = (input.bankLeft ? 1 : 0) + (input.bankRight ? -1 : 0)
    if (steerInput !== 0) {
      if (Math.abs(next.airspeed) > 0.25) {
        next.yaw += steerInput * steerScale * Math.sign(next.airspeed) * dt
      } else {
        // Creep-turn / pivot while nearly stopped
        next.yaw += steerInput * 1.4 * dt
      }
    }

    // ↑/W/Sprint = gas, ↓/S/Ctrl = brake (same as flight pitch mapping)
    const gas = input.pitchDown || input.speedUp
    const braking = input.pitchUp || input.speedDown

    if (gas && !braking) {
      if (next.airspeed >= -0.5) {
        const pull = accel * (1.25 - 0.45 * Math.min(1, Math.max(0, next.airspeed) / maxSpd))
        next.airspeed = Math.min(maxSpd, next.airspeed + pull * dt)
      } else {
        next.airspeed = Math.min(0, next.airspeed + brake * 1.2 * dt)
      }
    } else if (braking) {
      if (next.airspeed > 0.1) {
        next.airspeed = Math.max(0, next.airspeed - brake * dt)
      } else {
        next.airspeed = Math.max(-maxSpd * 0.32, next.airspeed - accel * 0.65 * dt)
      }
    } else {
      const drag = 1.1 + Math.abs(next.airspeed) * 0.1
      if (next.airspeed > 0) next.airspeed = Math.max(0, next.airspeed - drag * dt)
      else if (next.airspeed < 0) next.airspeed = Math.min(0, next.airspeed + drag * 1.15 * dt)
      if (Math.abs(next.airspeed) < 0.15) next.airspeed = 0
    }

    next.velocity.x = Math.sin(next.yaw) * next.airspeed
    next.velocity.z = Math.cos(next.yaw) * next.airspeed
    next.velocity.y = 0
    next.position.x += next.velocity.x * dt
    next.position.z += next.velocity.z * dt

    if (config.id === 'city') {
      const inGrace = performance.now() < driveCollideGraceUntil
      if (!inGrace) {
        const hit = resolveDriveCollisions(
          next.vehicleId,
          kind,
          next.position.x,
          next.position.z,
          next.yaw,
          next.airspeed,
        )
        next.position.x = hit.x
        next.position.z = hit.z
        next.yaw = hit.yaw
        next.airspeed = hit.speed
        next.velocity.x = Math.sin(next.yaw) * next.airspeed
        next.velocity.z = Math.cos(next.yaw) * next.airspeed

        if (hit.impact > 2.5) {
          const now = performance.now()
          if (now - lastCarCrashAt > 380) {
            lastCarCrashAt = now
            if (hit.impact > 7) playCrashImpact()
            else playWhoosh(0.12, 90, Math.min(0.5, hit.impact * 0.05))
          }
          next.pitch += Math.min(0.22, hit.impact * 0.018)
          next.roll += (Math.random() > 0.5 ? 1 : -1) * Math.min(0.28, hit.impact * 0.02)
          if (hit.impact > 10) {
            next.airspeed *= 0.15
          }
        }
      }

      const pushed = resolveBuildingPush(next.position, config.getHeight, 1.35, -1)
      next.position.x = pushed.x
      next.position.z = pushed.z
    }
    support = supportY(config, next.position.x, next.position.z)
    groundY = support.y
    next.position.y = groundY + vehicleRestClearance(kind)
    next.altitude = 0
    next.distance += Math.abs(next.airspeed) * dt

    // Body: nose dive under brake, squat under throttle, roll into turns
    const pitchTarget = braking && next.airspeed > 1 ? 0.07 : gas && next.airspeed > 1 ? -0.045 : 0
    const rollTarget = steerInput * Math.min(0.16, Math.abs(next.airspeed) * 0.012)
    next.pitch = lerp(next.pitch, pitchTarget, Math.min(1, 6 * dt))
    next.roll = lerp(next.roll, rollTarget, Math.min(1, 7 * dt))

    if (
      Math.abs(next.airspeed) < 1.6 &&
      (input.interact || input.land || input.jump)
    ) {
      setTakenVehicleId(-1)
      const exitYaw = next.yaw + Math.PI * 0.5
      next = beginWalking(next, config)
      next.position.x += Math.sin(exitYaw) * 2.4
      next.position.z += Math.cos(exitYaw) * 2.4
      next.position.y = supportY(config, next.position.x, next.position.z).y + WALK_FEET
      return { flight: next, parked }
    }

    return { flight: next, parked }
  }

  // --- Helicopter ---
  if (next.phase === 'helicopter') {
    next.craftType = 'helicopter'
    next.airtime += dt
    next.stallWarning = false

    if (input.bankLeft) next.yaw += 1.55 * dt
    if (input.bankRight) next.yaw -= 1.55 * dt

    // Accessible mapping: ↑/W forward, ↓/S climb, − descend (no Shift required)
    let climb = -1.0
    if (input.pitchUp) climb = 11
    else if (input.speedDown) climb = -10

    const wantForward = input.pitchDown || input.speedUp
    if (wantForward) next.airspeed = Math.min(30, next.airspeed + 16 * dt)
    else next.airspeed = Math.max(0, next.airspeed - 6 * dt)

    next.pitch = lerp(next.pitch, wantForward ? -0.2 : 0, Math.min(1, 5 * dt))
    next.roll = lerp(next.roll, input.bankLeft ? 0.18 : input.bankRight ? -0.18 : 0, Math.min(1, 5 * dt))

    next.velocity.x = Math.sin(next.yaw) * next.airspeed
    next.velocity.z = Math.cos(next.yaw) * next.airspeed
    next.velocity.y = climb

    next.position.x += next.velocity.x * dt
    next.position.y += next.velocity.y * dt
    next.position.z += next.velocity.z * dt

    support = supportY(config, next.position.x, next.position.z)
    groundY = support.y
    next.altitude = Math.max(0, next.position.y - groundY)
    next.maxAltitude = Math.max(next.maxAltitude, next.altitude)
    next.distance += Math.hypot(next.velocity.x, next.velocity.z) * dt
    if (climb > 1) next.maxClimbRate = Math.max(next.maxClimbRate, climb)

    if (next.position.y <= groundY + HELI_REST_CLEARANCE) {
      next.position.y = groundY + HELI_REST_CLEARANCE
      next.velocity.y = 0
      next.altitude = 0
      const idle = next.airspeed < 1.8 && !input.pitchUp
      if (idle && (input.land || input.interact || input.jump)) {
        parked = parkMountedGlider(next, parked, config)
        next = beginWalking(next, config)
        return { flight: next, parked }
      }
    }

    if (input.jump && next.altitude >= 6) {
      parked = parkMountedGlider(next, parked, config)
      next.phase = 'freefall'
      next.mountedId = -1
      next.craftType = 'glider'
      next.chuteDeployed = false
      next.chuteInflation = 0
      return { flight: next, parked }
    }

    return { flight: collideWorld(next, config), parked }
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
    const deckY = groundY

    // Hop off while nearly stopped — park the wing and walk
    if (
      next.airspeed < 3.2 &&
      (input.interact || input.land || (input.jump && !input.takeOff && !input.speedUp))
    ) {
      parked = parkMountedGlider(next, parked, config)
      const back = next.yaw + Math.PI
      const px = next.position.x + Math.sin(back) * 2.2
      const pz = next.position.z + Math.cos(back) * 2.2
      next = beginWalking(next, config)
      next.position.x = px
      next.position.z = pz
      next.position.y = supportY(config, px, pz).y + WALK_FEET
      return { flight: next, parked }
    }

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
    // Roofs count as ground in city — never snap to street through a building
    support = supportY(config, next.position.x, next.position.z)
    groundY = support.y

    // Ran off a rooftop / ledge while still rolling
    if (deckY - groundY > 2.5) {
      next.phase = 'flying'
      next.airspeed = Math.max(spd, CRUISE * 0.85)
      next.pitch = -0.08
      pitchVel = -0.1
      rollVel = 0
      next.position.y = deckY + GLIDER_REST_CLEARANCE
      next.altitude = Math.max(0, next.position.y - groundY)
      next.velocity = {
        x: Math.sin(next.yaw) * next.airspeed,
        y: -1.2,
        z: Math.cos(next.yaw) * next.airspeed,
      }
      next.airtime = 0
      return { flight: collideWorld(next, config), parked }
    }

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
    parked = parkMountedGlider(next, parked, config)
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

  // High up: hands-off trims slightly nose-up so you float; low: normal cruise trim
  const altFloat = smoothstep((next.altitude - 35) / 100) // 0 near ground → 1 above ~135 m
  const handsOffTrim = lerp(0.04, 0.1, altFloat)
  const trimPitch = input.pitchUp ? 0.14 : input.pitchDown ? -0.1 : handsOffTrim
  // Soft return to trim when releasing — don't snap into a dive
  const pitchSpring = input.pitchUp || input.pitchDown ? 2.0 : lerp(1.1, 0.55, altFloat)
  pitchVel +=
    (pitchCmd * PITCH_TORQUE * 0.8 - (next.pitch - trimPitch) * pitchSpring - pitchVel * (PITCH_DAMP + 1.0)) *
    dt
  rollVel += (rollCmd * ROLL_TORQUE - next.roll * 1.35 - rollVel * (ROLL_DAMP + 0.5)) * dt
  pitchVel = Math.max(-1.4, Math.min(1.4, pitchVel))
  rollVel = Math.max(-2.0, Math.min(2.0, rollVel))
  next.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, next.pitch + pitchVel * dt))
  next.roll = Math.max(-MAX_ROLL, Math.min(MAX_ROLL, next.roll + rollVel * dt))

  // Speed bar: hold a floatable cruise band when not accelerating.
  const FLOAT_SPEED = 10.5
  if (input.speedUp) {
    next.airspeed = Math.min(MAX_AIRSPEED, next.airspeed + 10 * dt)
  } else if (input.speedDown) {
    next.airspeed = Math.max(MIN_AIRSPEED, next.airspeed - 10 * dt)
  } else if (input.pitchUp) {
    const target = Math.max(FLOAT_SPEED, CRUISE - 1.2)
    next.airspeed += (target - next.airspeed) * Math.min(1, 1.6 * dt)
  } else {
    // Hands-off: settle on best-glide / cruise — stable float speed
    const target = lerp(CRUISE, FLOAT_SPEED + 0.8, altFloat * 0.35)
    next.airspeed += (target - next.airspeed) * Math.min(1, 1.2 * dt)
  }

  const wind = sampleAtmosphere(config, time, next.position)
  next.yaw += next.roll * 0.75 * dt

  const pathPitch = Math.asin(
    Math.max(-1, Math.min(1, next.velocity.y / Math.max(8, next.airspeed))),
  )
  const aoa = next.pitch - pathPitch + 0.08
  const { cl, stallSeverity } = liftCoeff(aoa)
  const speedStall = next.airspeed < STALL
  const handsOff = !input.pitchUp && !input.pitchDown
  const aoaStall = stallSeverity > 0.55 && !input.pitchUp && !(handsOff && altFloat > 0.4)
  next.stallWarning = speedStall || aoaStall

  const speed = next.airspeed
  const fx = Math.sin(next.yaw) * Math.cos(next.pitch)
  const fz = Math.cos(next.yaw) * Math.cos(next.pitch)

  const liftK = 1 - Math.exp(-3.2 * dt)
  smoothLift += (wind.y - smoothLift) * liftK

  const ldSink = BASE_SINK * (1.12 - Math.min(0.3, cl * 0.2))
  const ge = groundEffectFactor(next.altitude)
  let vy = next.pitch * speed * 0.75 - ldSink * ge + smoothLift

  if (input.pitchDown) {
    vy -= 4.5 + Math.abs(next.pitch) * 6
  } else if (input.pitchUp) {
    const thermalHelp = Math.max(0, smoothLift) * 0.35
    vy += 1.4 + next.pitch * 1.8 + thermalHelp
    vy = Math.min(vy, 4.5 + Math.max(0, smoothLift) * 0.6)
  } else {
    // Hands-off float: slow natural sink high up; closer to normal sink near ground
    // ~ -0.2 m/s at altitude, ~ -1.15 m/s low — plus any thermal lift
    const floatSink = lerp(-1.15, -0.22, altFloat)
    const targetVy = floatSink + smoothLift * 1.05 + next.pitch * speed * 0.25
    // Ease in — releasing climb blends into float instead of dropping
    const ease = 1 - Math.exp(-(0.9 + altFloat * 0.7) * dt)
    vy = lerp(vy, targetVy, ease)
  }

  // Don't punish a clean high-altitude glide with stall dumps
  if (speedStall && !input.pitchUp && altFloat < 0.5) vy -= 4
  else if (aoaStall) vy -= 1.5 + stallSeverity * 1.5

  next.velocity.x = fx * speed + wind.x * 0.55
  next.velocity.y = vy
  next.velocity.z = fz * speed + wind.z * 0.55

  if (next.velocity.y > next.maxClimbRate) {
    next.maxClimbRate = next.velocity.y
  }
  const airLift = smoothLift
  if (airLift > 0.35 || next.velocity.y > 0.55) {
    next.timeInLift += dt
  }

  if (aoaStall && stallSeverity > 0.8 && altFloat < 0.35) {
    next.roll += (Math.sin(time * 2.2) > 0 ? 1 : -1) * stallSeverity * 0.15 * dt
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
      parked = parkMountedGlider(next, parked, config)
      next = beginLanded(next, config)
    } else if (softLand) {
      parked = parkMountedGlider(next, parked, config)
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
