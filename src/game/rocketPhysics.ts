import type { BiomeConfig, FlightState, InputState, ParkedGlider, RocketMission } from '../types/game'
import { WALK_FEET } from '../types/game'
import { MOON_LZ, ROCKET_HATCH, ROCKET_PAD, ROCKET_TOWER } from './rocketPad'
import { ROCKET_REST_CLEARANCE } from './obstacles'
import { beginWalking } from './flightPhysics'
import { useGameStore } from './gameStore'

type TickCtx = {
  config: BiomeConfig
  dt: number
  parked: ParkedGlider[]
}

function mission(next: FlightState, patch: Partial<RocketMission>): RocketMission {
  return { ...(next.rocketMission ?? { step: 'ready', t: 0, stage1Separated: false, elevatorY: 0 }), ...patch }
}

function padGroundY(config: BiomeConfig, x: number, z: number) {
  return config.getHeight(x, z)
}

/** Scripted rocket elevator, launch, staging, moon transfer, landing. */
export function tickRocketPhases(
  state: FlightState,
  input: InputState,
  ctx: TickCtx,
): { flight: FlightState; parked: ParkedGlider[]; skipCollide?: boolean } {
  let next = state
  let parked = ctx.parked
  const { config, dt } = ctx
  const gy = padGroundY(config, next.position.x, next.position.z)

  // --- Tower elevator ---
  if (next.phase === 'rocketElevator') {
    const m = next.rocketMission ?? mission(next, { step: 'elevator', t: 0, stage1Separated: false, elevatorY: gy + WALK_FEET })
    const targetY = gy + ROCKET_TOWER.topY + WALK_FEET
    const newY = Math.min(targetY, m.elevatorY + ROCKET_TOWER.speed * dt)
    next = {
      ...next,
      position: { x: ROCKET_TOWER.baseX, y: newY, z: ROCKET_TOWER.baseZ },
      velocity: { x: 0, y: 0, z: 0 },
      airspeed: 0,
      altitude: Math.max(0, newY - gy),
      rocketMission: mission(next, { ...m, elevatorY: newY, t: m.t + dt }),
    }
    if (newY >= targetY - 0.05) {
      next = {
        ...next,
        phase: 'walking',
        position: { x: ROCKET_HATCH.x - 6, y: targetY, z: ROCKET_HATCH.z },
        rocketMission: null,
      }
    }
    return { flight: next, parked, skipCollide: true }
  }

  if (next.phase !== 'rocket' && next.phase !== 'rocketCapsule') {
    return { flight: next, parked }
  }

  let m = next.rocketMission ?? mission(next, { step: 'ready', t: 0, stage1Separated: false, elevatorY: 0 })
  m = { ...m, t: m.t + dt }

  // Start countdown
  if (m.step === 'ready' && (input.interact || input.takeOff || m.t > 2.5)) {
    m = { ...m, step: 'countdown', t: 0 }
  }

  const padY = padGroundY(config, ROCKET_PAD.x, ROCKET_PAD.z) + ROCKET_REST_CLEARANCE

  if (m.step === 'countdown') {
    next = {
      ...next,
      position: { x: ROCKET_PAD.x, y: padY, z: ROCKET_PAD.z },
      yaw: ROCKET_PAD.yaw,
      pitch: 0,
      roll: 0,
      velocity: { x: 0, y: 0, z: 0 },
      airspeed: 0,
      altitude: ROCKET_REST_CLEARANCE,
      rocketMission: m,
    }
    if (m.t >= 10) {
      m = { ...m, step: 'liftoff', t: 0 }
    }
  }

  if (m.step === 'liftoff' || m.step === 'ascent' || m.step === 'meco' || m.step === 'secondBurn') {
    const thrust = m.step === 'meco' ? 0 : m.step === 'secondBurn' ? 95 : 120
    const pitch = m.step === 'liftoff' ? 0 : m.step === 'ascent' ? -0.08 : m.step === 'secondBurn' ? -0.12 : 0
    next.pitch = pitch
    next.velocity.y = thrust * (m.step === 'liftoff' ? 0.85 : 1)
    next.velocity.x = Math.sin(next.yaw) * Math.cos(pitch) * thrust * 0.35
    next.velocity.z = Math.cos(next.yaw) * Math.cos(pitch) * thrust * 0.35
    next.airspeed = Math.hypot(next.velocity.x, next.velocity.y, next.velocity.z)
    next.position.x += next.velocity.x * dt
    next.position.y += next.velocity.y * dt
    next.position.z += next.velocity.z * dt
    const gY = padGroundY(config, next.position.x, next.position.z)
    next.altitude = Math.max(0, next.position.y - gY)
    next.maxAltitude = Math.max(next.maxAltitude, next.altitude)
    next.distance += next.airspeed * dt
    next.airtime += dt

    if (m.step === 'liftoff' && m.t > 4) m = { ...m, step: 'ascent', t: 0 }
    if (m.step === 'ascent' && next.altitude > 8000) m = { ...m, step: 'meco', t: 0 }
    if (m.step === 'meco' && m.t > 2.5) {
      m = { ...m, step: 'secondBurn', stage1Separated: true, t: 0 }
      next.phase = 'rocketCapsule'
    }
    if (m.step === 'secondBurn' && next.altitude > 18000) m = { ...m, step: 'coast', t: 0 }
  }

  if (m.step === 'coast') {
    next.velocity.y *= 0.998
    next.velocity.x *= 0.998
    next.velocity.z *= 0.998
    next.airspeed = Math.hypot(next.velocity.x, next.velocity.y, next.velocity.z)
    next.position.x += next.velocity.x * dt
    next.position.y += next.velocity.y * dt
    next.position.z += next.velocity.z * dt
    next.altitude = Math.max(next.altitude, next.altitude + next.velocity.y * dt * 0.01)
    next.maxAltitude = Math.max(next.maxAltitude, next.altitude)
    next.airtime += dt

    if (m.t > 6 && config.id !== 'moon') {
      useGameStore.getState().travelToBiome(
        'moon',
        { x: MOON_LZ.x, z: MOON_LZ.z, yaw: 0, alt: 4200 },
        'Lunar Surface',
      )
      next = useGameStore.getState().flight
      m = next.rocketMission ?? m
      m = { ...m, step: 'entry', t: 0 }
    } else if (config.id === 'moon' && m.t > 2) {
      m = { ...m, step: 'entry', t: 0 }
    }
  }

  if (m.step === 'entry' || m.step === 'landingBurn') {
    next.phase = 'rocketCapsule'
    const moonGy = config.getHeight(MOON_LZ.x, MOON_LZ.z)
    const targetY = moonGy + 120
    if (m.step === 'entry') {
      next.position = { x: MOON_LZ.x, y: targetY + 80, z: MOON_LZ.z - 40 }
      next.velocity = { x: 0, y: -25, z: 8 }
      m = { ...m, step: 'landingBurn', t: 0 }
    }
    next.velocity.y = Math.max(-35, next.velocity.y - 4 * dt)
    next.velocity.z *= 0.99
    next.velocity.x *= 0.99
    next.position.x += next.velocity.x * dt
    next.position.y += next.velocity.y * dt
    next.position.z += next.velocity.z * dt
    next.altitude = Math.max(0, next.position.y - moonGy)
    next.airspeed = Math.hypot(next.velocity.x, next.velocity.y, next.velocity.z)

    if (next.position.y <= moonGy + 2.2) {
      next.position.y = moonGy + 2.2
      next.velocity = { x: 0, y: 0, z: 0 }
      next.airspeed = 0
      next.altitude = 2.2
      m = { ...m, step: 'landed', t: 0 }
    }
  }

  if (m.step === 'landed') {
    next.velocity = { x: 0, y: 0, z: 0 }
    next.airspeed = 0
    if (input.interact || input.land) {
      parked = parked.map((g) =>
        g.craftType === 'rocket' ? { ...g, available: true } : g,
      )
      next = beginWalking(next, config)
      next.rocketMission = null
      next.mountedId = -1
      next.craftType = 'glider'
      return { flight: next, parked }
    }
  }

  next.rocketMission = m
  return { flight: next, parked, skipCollide: true }
}
