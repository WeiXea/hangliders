import { create } from 'zustand'
import type {
  Biome,
  CameraMode,
  ChallengeRing,
  FlightState,
  FlightStats,
  GameMode,
  InputState,
  ParkedGlider,
  Screen,
  TiltCalibration,
  TiltPermission,
} from '../types/game'
import { INITIAL_FLIGHT, INITIAL_INPUT } from '../types/game'
import { BIOME_CONFIGS } from './biomeConfigs'
import {
  createInitialFlight,
  getLandingQuality,
  initParkedGliders,
} from './flightPhysics'
import { playRingSound } from './audio'
import { checkRingCollision } from './obstacles'
import {
  isTiltSupported,
  requestTiltPermission,
  writeStoredTiltPreference,
} from './tilt'
import { setRoomSession } from './netSync'

const CAMERA_CYCLE: CameraMode[] = ['chase', 'fpv', 'side']

export type RoomRole = 'solo' | 'host' | 'guest'

interface GameStore {
  screen: Screen
  biome: Biome
  mode: GameMode
  cameraMode: CameraMode
  flight: FlightState
  input: InputState
  rings: ChallengeRing[]
  parkedGliders: ParkedGlider[]
  stats: FlightStats | null
  simTime: number
  tiltSupported: boolean
  tiltEnabled: boolean
  tiltPermission: TiltPermission
  tiltCalibration: TiltCalibration | null

  playerName: string
  roomCode: string | null
  roomRole: RoomRole
  roomStatus: string
  peerConnected: boolean
  remoteFlight: FlightState | null
  remoteName: string

  setScreen: (screen: Screen) => void
  setBiome: (biome: Biome) => void
  setMode: (mode: GameMode) => void
  setCameraMode: (mode: CameraMode) => void
  cycleCamera: () => void
  setInput: (partial: Partial<InputState>) => void
  resetInput: () => void
  setTiltEnabled: (enabled: boolean) => Promise<boolean>
  setTiltCalibration: (calib: TiltCalibration | null) => void
  startFlight: () => void
  updateFlight: (flight: FlightState, parked?: ParkedGlider[]) => void
  setSimTime: (t: number) => void
  checkRings: () => void
  finishFlight: () => void
  goHome: () => void

  setPlayerName: (name: string) => void
  setRoomMeta: (partial: {
    roomCode?: string | null
    roomRole?: RoomRole
    roomStatus?: string
    peerConnected?: boolean
    remoteName?: string
  }) => void
  setRemoteFlight: (flight: FlightState | null, name?: string) => void
  applyRemoteHello: (biome: Biome, mode: GameMode, name: string) => void
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
  parkedGliders: initParkedGliders(BIOME_CONFIGS.beach),
  stats: null,
  simTime: 0,
  tiltSupported: isTiltSupported(),
  tiltEnabled: false,
  tiltPermission: isTiltSupported() ? 'unknown' : 'denied',
  tiltCalibration: null,

  playerName: 'Pilot',
  roomCode: null,
  roomRole: 'solo',
  roomStatus: '',
  peerConnected: false,
  remoteFlight: null,
  remoteName: '',

  setScreen: (screen) => set({ screen }),
  setBiome: (biome) =>
    set({
      biome,
      rings: initRings(biome),
      parkedGliders: initParkedGliders(BIOME_CONFIGS[biome]),
    }),
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

  setTiltCalibration: (tiltCalibration) => set({ tiltCalibration }),

  setTiltEnabled: async (enabled) => {
    if (!enabled) {
      writeStoredTiltPreference(false)
      set({
        tiltEnabled: false,
        tiltCalibration: null,
        input: {
          ...get().input,
          pitchUp: false,
          pitchDown: false,
          bankLeft: false,
          bankRight: false,
        },
      })
      return true
    }

    if (!isTiltSupported()) {
      set({ tiltSupported: false, tiltEnabled: false, tiltPermission: 'denied' })
      return false
    }

    let permission = get().tiltPermission
    if (permission !== 'granted') {
      permission = await requestTiltPermission()
    }

    if (permission !== 'granted') {
      writeStoredTiltPreference(false)
      set({ tiltEnabled: false, tiltPermission: permission })
      return false
    }

    writeStoredTiltPreference(true)
    set({
      tiltEnabled: true,
      tiltPermission: 'granted',
      tiltSupported: true,
      // Recalibrate on next orientation sample
      tiltCalibration: null,
    })
    return true
  },

  startFlight: () => {
    const { biome } = get()
    const config = BIOME_CONFIGS[biome]
    set({
      screen: 'flight',
      flight: createInitialFlight(config),
      input: { ...INITIAL_INPUT },
      rings: initRings(biome),
      parkedGliders: initParkedGliders(config),
      stats: null,
      simTime: 0,
      // Keep tilt on across restarts; re-zero so hold angle is neutral
      tiltCalibration: null,
    })
  },

  updateFlight: (flight, parked) =>
    set(parked ? { flight, parkedGliders: parked } : { flight }),

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

  goHome: () => {
    setRoomSession(null)
    set({
      screen: 'home',
      flight: { ...INITIAL_FLIGHT },
      input: { ...INITIAL_INPUT },
      stats: null,
      simTime: 0,
      roomCode: null,
      roomRole: 'solo',
      roomStatus: '',
      peerConnected: false,
      remoteFlight: null,
      remoteName: '',
    })
  },

  setPlayerName: (playerName) => set({ playerName: playerName.slice(0, 16) || 'Pilot' }),

  setRoomMeta: (partial) => set(partial),

  setRemoteFlight: (remoteFlight, name) =>
    set({
      remoteFlight,
      ...(name != null ? { remoteName: name } : {}),
    }),

  applyRemoteHello: (biome, mode, name) => {
    const config = BIOME_CONFIGS[biome]
    set({
      biome,
      mode,
      remoteName: name,
      peerConnected: true,
      roomStatus: `${name} joined`,
      rings: initRings(biome),
      parkedGliders: initParkedGliders(config),
    })
  },
}))

