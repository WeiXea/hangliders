import type { BiomeConfig, FlightState, InputState, ParkedGlider, RocketMission } from '../types/game'
import {
  MOON_LZ,
  ROCKET_HATCH,
  ROCKET_PAD,
  ROCKET_TIMELINE,
  ROCKET_TOWER,
  rocketCatwalkY,
  rocketPadDeckY,
} from './rocketPad'
import { ROCKET_REST_CLEARANCE } from './obstacles'
import { beginWalking } from './flightPhysics'
import { useGameStore } from './gameStore'

type TickCtx = {
  config: BiomeConfig
  dt: number
  parked: ParkedGlider[]
}

function mission(next: FlightState, patch: Partial<RocketMission>): RocketMission {
  return {
    ...(next.rocketMission ?? {
      step: 'ready',
      t: 0,
      stage1Separated: false,
      elevatorY: 0,
      displayAltM: 0,
    }),
    ...patch,
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}

function padGroundY(config: BiomeConfig) {
  return config.getHeight(ROCKET_PAD.x, ROCKET_PAD.z)
}

function scriptedAlt(step: RocketMission['step'], t: number): number {
  switch (step) {
    case 'countdown':
    case 'ready':
      return 0
    case 'liftoff':
      return lerp(0, 120, t / ROCKET_TIMELINE.liftoff)
    case 'ascent':
      return lerp(120, 72000, t / ROCKET_TIMELINE.stage1Burn)
    case 'meco':
      return 72000
    case 'secondBurn':
      return lerp(72000, 210000, t / ROCKET_TIMELINE.stage2Burn)
    case 'coast':
      return lerp(210000, 380000, t / ROCKET_TIMELINE.coast)
    case 'entry':
      return 80000
    case 'landingBurn':
      return lerp(1200, 0, t / ROCKET_TIMELINE.landingBurn)
    case 'landed':
      return 0
    default:
      return 0
  }
}

/** Scripted rocket elevator, launch, staging, moon transfer, landing (~2 min). */
export function tickRocketPhases(
  state: FlightState,
  input: InputState,
  ctx: TickCtx,
): { flight: FlightState; parked: ParkedGlider[]; skipCollide?: boolean } {
  let next = state
  let parked = ctx.parked
  const { config, dt } = ctx
  const padGy = padGroundY(config)
  const deckY = rocketPadDeckY(padGy)
  const catwalkY = rocketCatwalkY(padGy)

  // --- Tower elevator ---
  if (next.phase === 'rocketElevator') {
    const m = next.rocketMission ?? mission(next, { step: 'elevator', t: 0, stage1Separated: false, elevatorY: next.position.y, displayAltM: 0 })
    const targetY = catwalkY
    const newY = Math.min(targetY, m.elevatorY + ROCKET_TOWER.speed * dt)
    next = {
      ...next,
      position: { x: ROCKET_TOWER.baseX, y: newY, z: ROCKET_TOWER.baseZ },
      velocity: { x: 0, y: 0, z: 0 },
      airspeed: 0,
      altitude: Math.max(0, newY - padGy),
      rocketMission: mission(next, { ...m, elevatorY: newY, t: m.t + dt }),
    }
    if (newY >= targetY - 0.05) {
      next = {
        ...next,
        phase: 'walking',
        position: { x: ROCKET_HATCH.x - 4, y: catwalkY, z: ROCKET_HATCH.z },
        rocketMission: null,
      }
    }
    return { flight: next, parked, skipCollide: true }
  }

  if (next.phase !== 'rocket' && next.phase !== 'rocketCapsule') {
    return { flight: next, parked }
  }

  let m = next.rocketMission ?? mission(next, { step: 'ready', t: 0, stage1Separated: false, elevatorY: 0, displayAltM: 0 })
  m = { ...m, t: m.t + dt }

  if (m.step === 'ready' && (input.interact || input.takeOff || m.t > 2.5)) {
    m = { ...m, step: 'countdown', t: 0 }
  }

  const padY = deckY + ROCKET_REST_CLEARANCE
  const displayAlt = scriptedAlt(m.step, m.t)
  m = { ...m, displayAltM: displayAlt }

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
    if (m.t >= ROCKET_TIMELINE.countdown) {
      m = { ...m, step: 'liftoff', t: 0 }
    }
  }

  if (m.step === 'liftoff') {
    const climb = lerp(padY, padY + 180, m.t / ROCKET_TIMELINE.liftoff)
    next = {
      ...next,
      position: { x: ROCKET_PAD.x, y: climb, z: ROCKET_PAD.z },
      pitch: 0,
      roll: 0,
      velocity: { x: 0, y: 28, z: 0 },
      airspeed: 28,
      altitude: climb - deckY,
      rocketMission: m,
    }
    if (m.t >= ROCKET_TIMELINE.liftoff) {
      m = { ...m, step: 'ascent', t: 0 }
    }
  }

  if (m.step === 'ascent') {
    const climb = lerp(padY + 180, padY + 520, m.t / ROCKET_TIMELINE.stage1Burn)
    next = {
      ...next,
      position: { x: ROCKET_PAD.x, y: climb, z: ROCKET_PAD.z },
      pitch: -0.06,
      roll: 0,
      velocity: { x: 0, y: 85, z: 0 },
      airspeed: 85,
      altitude: displayAlt,
      rocketMission: m,
    }
    next.maxAltitude = Math.max(next.maxAltitude, displayAlt)
    next.airtime += dt
    if (m.t >= ROCKET_TIMELINE.stage1Burn) {
      m = { ...m, step: 'meco', t: 0 }
    }
  }

  if (m.step === 'meco') {
    next = {
      ...next,
      position: { x: ROCKET_PAD.x, y: padY + 520, z: ROCKET_PAD.z },
      pitch: 0,
      velocity: { x: 0, y: 12, z: 0 },
      airspeed: 12,
      altitude: displayAlt,
      rocketMission: m,
    }
    if (m.t >= ROCKET_TIMELINE.meco) {
      m = { ...m, step: 'secondBurn', stage1Separated: true, t: 0 }
      next.phase = 'rocketCapsule'
    }
  }

  if (m.step === 'secondBurn') {
    next = {
      ...next,
      position: { x: ROCKET_PAD.x, y: padY + 520 + m.t * 6, z: ROCKET_PAD.z },
      pitch: -0.1,
      velocity: { x: 0, y: 95, z: 0 },
      airspeed: 95,
      altitude: displayAlt,
      rocketMission: m,
    }
    next.maxAltitude = Math.max(next.maxAltitude, displayAlt)
    next.airtime += dt
    if (m.t >= ROCKET_TIMELINE.stage2Burn) {
      m = { ...m, step: 'coast', t: 0 }
    }
  }

  if (m.step === 'coast') {
    next = {
      ...next,
      pitch: -0.04,
      velocity: { x: 0, y: 18, z: 0 },
      airspeed: 18,
      altitude: displayAlt,
      rocketMission: m,
    }
    next.maxAltitude = Math.max(next.maxAltitude, displayAlt)
    next.airtime += dt

    if (m.t >= ROCKET_TIMELINE.coast * 0.72 && config.id !== 'moon') {
      useGameStore.getState().travelToBiome(
        'moon',
        { x: MOON_LZ.x, z: MOON_LZ.z, yaw: 0, alt: 1200 },
        'Lunar Surface',
      )
      next = useGameStore.getState().flight
      m = next.rocketMission ?? m
      m = { ...m, step: 'entry', t: 0, displayAltM: 80000 }
    } else if (config.id === 'moon' && m.t >= ROCKET_TIMELINE.coast) {
      m = { ...m, step: 'entry', t: 0 }
    }
  }

  if (m.step === 'entry' || m.step === 'landingBurn') {
    next.phase = 'rocketCapsule'
    const moonGy = config.getHeight(MOON_LZ.x, MOON_LZ.z)
    if (m.step === 'entry') {
      next.position = { x: MOON_LZ.x, y: moonGy + 900, z: MOON_LZ.z - 60 }
      next.velocity = { x: 0, y: -40, z: 10 }
      m = { ...m, step: 'landingBurn', t: 0, displayAltM: 900 }
    }
    next.velocity.y = Math.max(-55, next.velocity.y - 6 * dt)
    next.position.x += next.velocity.x * dt
    next.position.y += next.velocity.y * dt
    next.position.z += next.velocity.z * dt
    next.altitude = Math.max(0, next.position.y - moonGy)
    next.pitch = 0.12
    m.displayAltM = next.altitude
    next.airspeed = Math.hypot(next.velocity.x, next.velocity.y, next.velocity.z)
    next.airtime += dt

    if (next.position.y <= moonGy + 2.4) {
      next.position.y = moonGy + 2.4
      next.velocity = { x: 0, y: 0, z: 0 }
      next.airspeed = 0
      next.altitude = 2.4
      m = { ...m, step: 'landed', t: 0, displayAltM: 0 }
    }
  }

  if (m.step === 'landed') {
    next.velocity = { x: 0, y: 0, z: 0 }
    next.airspeed = 0
    next.altitude = 2.4
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

/** Seconds remaining until lunar landing (approx). */
export function rocketMissionEtaSec(m: RocketMission | null): number | null {
  if (!m) return null
  const T = ROCKET_TIMELINE
  const left = (_step: RocketMission['step'], t: number, dur: number) => Math.max(0, dur - t)
  switch (m.step) {
    case 'countdown':
      return (
        left('countdown', m.t, T.countdown) +
        T.liftoff +
        T.stage1Burn +
        T.meco +
        T.stage2Burn +
        T.coast +
        T.landingBurn
      )
    case 'liftoff':
      return left('liftoff', m.t, T.liftoff) + T.stage1Burn + T.meco + T.stage2Burn + T.coast + T.landingBurn
    case 'ascent':
      return left('ascent', m.t, T.stage1Burn) + T.meco + T.stage2Burn + T.coast + T.landingBurn
    case 'meco':
      return left('meco', m.t, T.meco) + T.stage2Burn + T.coast + T.landingBurn
    case 'secondBurn':
      return left('secondBurn', m.t, T.stage2Burn) + T.coast + T.landingBurn
    case 'coast':
      return left('coast', m.t, T.coast) + T.landingBurn
    case 'landingBurn':
      return left('landingBurn', m.t, T.landingBurn)
    case 'landed':
      return 0
    default:
      return null
  }
}
