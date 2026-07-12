import { create } from 'zustand'
import type {
  Biome,
  CameraMode,
  ChallengeRing,
  FlightState,
  FlightStats,
  GameMode,
  InputState,
  Screen,
} from '../types/game'
import { INITIAL_FLIGHT, INITIAL_INPUT } from '../types/game'
import { BIOME_CONFIGS } from './biomeConfigs'
import { createInitialFlight, getLandingQuality } from './flightPhysics'
import { playRingSound } from './audio'
import { checkRingCollision } from './obstacles'

const CAMERA_CYCLE: CameraMode[] = ['chase', 'fpv', 'side']

interface GameStore {
  screen: Screen
  biome: Biome
  mode: GameMode
  cameraMode: CameraMode
  flight: FlightState
  input: InputState
  rings: ChallengeRing[]
  stats: FlightStats | null
  simTime: number

  setScreen: (screen: Screen) => void
  setBiome: (biome: Biome) => void
  setMode: (mode: GameMode) => void
  setCameraMode: (mode: CameraMode) => void
  cycleCamera: () => void
  setInput: (partial: Partial<InputState>) => void
  resetInput: () => void
  startFlight: () => void
  updateFlight: (flight: FlightState) => void
  setSimTime: (t: number) => void
  checkRings: () => void
  finishFlight: () => void
  goHome: () => void
}

function initRings(biome: Biome): ChallengeRing[] {
  const config = BIOME_CONFIGS[biome]
  return config.challengeRings.map((pos, i) => {
    const ground = config.getHeight(pos.x, pos.z)
    const airHeight = Math.max(pos.y, ground + 22)
    return {
      id: i,
      position: { x: pos.x, y: airHeight, z: pos.z },
      radius: 12,
      passed: false,
    }
  })
}

function calcScore(
  flight: FlightState,
  rings: ChallengeRing[],
  mode: GameMode,
  landingQuality: FlightStats['landingQuality'],
): number {
  let score = Math.round(flight.distance * 2 + flight.maxAltitude * 3 + flight.airtime * 10)
  if (mode === 'challenge') {
    const passed = rings.filter((r) => r.passed).length
    score += passed * 500
    if (landingQuality === 'perfect') score += 1000
    else if (landingQuality === 'good') score += 500
  }
  return score
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'home',
  biome: 'beach',
  mode: 'free',
  cameraMode: 'chase',
  flight: { ...INITIAL_FLIGHT },
  input: { ...INITIAL_INPUT },
  rings: initRings('beach'),
  stats: null,
  simTime: 0,

  setScreen: (screen) => set({ screen }),
  setBiome: (biome) => set({ biome, rings: initRings(biome) }),
  setMode: (mode) => set({ mode }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  cycleCamera: () => {
    const { cameraMode } = get()
    const idx = CAMERA_CYCLE.indexOf(cameraMode)
    set({ cameraMode: CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length] })
  },

  setInput: (partial) =>
    set((s) => ({ input: { ...s.input, ...partial } })),

  resetInput: () => set({ input: { ...INITIAL_INPUT } }),

  startFlight: () => {
    const { biome } = get()
    const config = BIOME_CONFIGS[biome]
    set({
      screen: 'flight',
      flight: createInitialFlight(config),
      input: { ...INITIAL_INPUT },
      rings: initRings(biome),
      stats: null,
      simTime: 0,
    })
  },

  updateFlight: (flight) => set({ flight }),

  setSimTime: (simTime) => set({ simTime }),

  checkRings: () => {
    const { flight, rings, mode, biome } = get()
    if (mode !== 'challenge' || flight.phase !== 'flying') return

    const nextRing = rings.find((r) => !r.passed)
    if (!nextRing) return

    const idx = rings.findIndex((r) => r.id === nextRing.id)
    const config = BIOME_CONFIGS[biome]
    const prev = idx === 0 ? config.launchPosition : rings[idx - 1].position
    const yaw = Math.atan2(nextRing.position.x - prev.x, nextRing.position.z - prev.z)
    const result = checkRingCollision(flight.position, nextRing, yaw)

    if (result === 'pass') {
      playRingSound()
      set({
        rings: rings.map((r) =>
          r.id === nextRing.id ? { ...r, passed: true } : r,
        ),
      })
    } else if (result === 'crash') {
      set({
        flight: {
          ...flight,
          phase: 'crashed',
          airspeed: 0,
          velocity: { x: 0, y: 0, z: 0 },
        },
      })
    }
  },

  finishFlight: () => {
    const { flight, rings, mode, biome } = get()
    const config = BIOME_CONFIGS[biome]
    let landingQuality = getLandingQuality(flight)

    if (mode === 'challenge' && flight.phase === 'landed') {
      const lz = config.landingZone
      const dx = flight.position.x - lz.center.x
      const dz = flight.position.z - lz.center.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist <= lz.radius) {
        landingQuality = flight.airspeed === 0 ? 'perfect' : 'good'
      }
    }

    const stats: FlightStats = {
      airtime: flight.airtime,
      maxAltitude: flight.maxAltitude,
      distance: flight.distance,
      ringsPassed: rings.filter((r) => r.passed).length,
      totalRings: rings.length,
      landingQuality,
      score: calcScore(flight, rings, mode, landingQuality),
    }
    set({ stats, screen: 'result' })
  },

  goHome: () =>
    set({
      screen: 'home',
      flight: { ...INITIAL_FLIGHT },
      input: { ...INITIAL_INPUT },
      stats: null,
      simTime: 0,
    }),
}))
