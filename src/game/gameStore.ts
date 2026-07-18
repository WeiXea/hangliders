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
import { INITIAL_FLIGHT, INITIAL_INPUT, WALK_FEET } from '../types/game'
import { BIOME_CONFIGS } from './biomeConfigs'
import {
  createInitialFlight,
  getLandingQuality,
  initParkedGliders,
} from './flightPhysics'
import { buildChallengeRings } from './challengeCourse'
import { buildXCTask, type XCTask } from './xcTask'
import { playRingSound } from './audio'
import { checkRingCollision, GLIDER_REST_CLEARANCE } from './obstacles'
import {
  pickCityLaunchPad,
  getBuildingById,
  buildingRoofY,
  CITY_STREET_DECK,
} from './cityBuildings'
import {
  isTiltSupported,
  requestTiltPermission,
  writeStoredTiltPreference,
} from './tilt'

const PILOT_NAME_KEY = 'hangglider-pilot-name'

function readStoredPilotName(): string {
  try {
    return localStorage.getItem(PILOT_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function displayPilotName(name: string): string {
  const t = name.trim()
  return t.length > 0 ? t : 'Pilot'
}
import { setRoomSession } from './netSync'
import { resetTandemRejoin } from './tandem'

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
  xcTask: XCTask | null
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
  /** Active city rooftop pad id, or null outside city / unset */
  cityLaunchPadId: number | null
  cityLaunchLabel: string | null
  /** Brief banner when crossing into another biome */
  travelBanner: string | null
  mapOpen: boolean

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
  /** Keep jet flight while swapping biome scenery */
  travelToBiome: (
    biome: Biome,
    spawn: { x: number; z: number; yaw: number; alt: number },
    label: string,
  ) => void
  clearTravelBanner: () => void
  setMapOpen: (open: boolean) => void
  updateFlight: (flight: FlightState, parked?: ParkedGlider[]) => void
  setSimTime: (t: number) => void
  checkRings: () => void
  checkXC: () => void
  finishFlight: () => void
  endFlightFromWalk: () => void
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
  return buildChallengeRings(biome)
}

function calcScore(
  flight: FlightState,
  rings: ChallengeRing[],
  mode: GameMode,
  landingQuality: FlightStats['landingQuality'],
  xcTask: XCTask | null,
): number {
  let score = Math.round(
    flight.distance * 2 +
      flight.maxAltitude * 3 +
      flight.airtime * 10 +
      flight.timeInLift * 40 +
      flight.maxClimbRate * 80,
  )
  if (mode === 'challenge') {
    const passed = rings.filter((r) => r.passed).length
    score += passed * 500
    score += Math.round(flight.timeInLift * 60)
    if (landingQuality === 'perfect') score += 1000
    else if (landingQuality === 'good') score += 500
  }
  if (mode === 'xc' && xcTask) {
    const tagged = xcTask.turnpoints.filter((t) => t.tagged).length
    score += tagged * 750
    score += Math.round(flight.timeInLift * 80)
    score += Math.round(flight.distance * 1.5)
    if (xcTask.completed) {
      score += 2500
      if (xcTask.startTime != null && xcTask.finishTime != null) {
        const elapsed = Math.max(1, xcTask.finishTime - xcTask.startTime)
        score += Math.round(120000 / elapsed)
      }
    }
  }
  return score
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'home',
  biome: 'tankfarm',
  mode: 'free',
  cameraMode: 'chase',
  flight: { ...INITIAL_FLIGHT },
  input: { ...INITIAL_INPUT },
  rings: initRings('tankfarm'),
  xcTask: null,
  parkedGliders: initParkedGliders(BIOME_CONFIGS.tankfarm),
  stats: null,
  simTime: 0,
  tiltSupported: isTiltSupported(),
  tiltEnabled: false,
  tiltPermission: isTiltSupported() ? 'unknown' : 'denied',
  tiltCalibration: null,

  playerName: readStoredPilotName(),
  roomCode: null,
  roomRole: 'solo',
  roomStatus: '',
  peerConnected: false,
  remoteFlight: null,
  remoteName: '',
  cityLaunchPadId: null,
  cityLaunchLabel: null,
  travelBanner: null,
  mapOpen: false,

  setScreen: (screen) => set({ screen }),
  setBiome: (biome) =>
    set({
      biome,
      rings: initRings(biome),
      xcTask: get().mode === 'xc' ? buildXCTask(biome) : null,
      parkedGliders: initParkedGliders(BIOME_CONFIGS[biome]),
    }),
  setMapOpen: (mapOpen) => set({ mapOpen }),
  clearTravelBanner: () => set({ travelBanner: null }),

  travelToBiome: (biome, spawn, label) => {
    const config = BIOME_CONFIGS[biome]
    const ground = config.getHeight(spawn.x, spawn.z)
    const { flight } = get()
    const keepRocket =
      flight.phase === 'rocket' ||
      flight.phase === 'rocketCapsule' ||
      flight.phase === 'rocketElevator'
    set({
      biome,
      rings: initRings(biome),
      xcTask: get().mode === 'xc' ? buildXCTask(biome) : null,
      parkedGliders: initParkedGliders(config),
      cityLaunchPadId: null,
      cityLaunchLabel: null,
      travelBanner: `Entering ${label}`,
      flight: {
        ...flight,
        position: {
          x: spawn.x,
          y: ground + spawn.alt,
          z: spawn.z,
        },
        yaw: spawn.yaw,
        altitude: spawn.alt,
        pitch: keepRocket ? flight.pitch : Math.min(0.12, flight.pitch),
        roll: keepRocket ? flight.roll : flight.roll * 0.4,
        phase: keepRocket ? flight.phase : flight.phase,
        rocketMission: flight.rocketMission,
      },
    })
  },
  setMode: (mode) =>
    set({
      mode,
      xcTask: mode === 'xc' ? buildXCTask(get().biome) : null,
    }),
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
    const { biome, mode } = get()
    const config = BIOME_CONFIGS[biome]
    resetTandemRejoin()
    let flight = createInitialFlight(config)
    let cityLaunchPadId: number | null = null
    let cityLaunchLabel: string | null = null
    let travelBanner: string | null = null
    if (biome === 'tankfarm' && mode === 'free') {
      const x = config.launchPosition.x
      const z = config.launchPosition.z
      const y = config.getHeight(x, z) + WALK_FEET
      flight = {
        ...flight,
        phase: 'walking',
        position: { x, y, z },
        yaw: config.launchYaw,
        altitude: 0,
        airspeed: 0,
        velocity: { x: 0, y: 0, z: 0 },
      }
      travelBanner = 'Tank Farm — walk the yard between tanks · mount a glider to fly'
    }
    if (biome === 'skatepath' && mode === 'free') {
      const x = config.launchPosition.x
      const z = config.launchPosition.z
      const y = config.getHeight(x, z) + WALK_FEET
      flight = {
        ...flight,
        phase: 'walking',
        position: { x, y, z },
        yaw: config.launchYaw,
        altitude: 0,
        airspeed: 0,
        velocity: { x: 0, y: 0, z: 0 },
      }
      travelBanner = 'Skate Path — walk the long boardwalk · weave obstacles · mount a glider to fly'
    }
    if (biome === 'city') {
      if (mode === 'free') {
        const x = config.launchPosition.x
        const z = config.launchPosition.z
        const streetY = config.getHeight(x, z) + CITY_STREET_DECK + WALK_FEET
        flight = {
          ...flight,
          phase: 'walking',
          position: { x, y: streetY, z },
          yaw: config.launchYaw,
          altitude: 0,
          airspeed: 0,
          velocity: { x: 0, y: 0, z: 0 },
        }
        travelBanner =
          'Urban Skyline — cyan pavilion = metro · yellow bay = garage · green mat = shops · purple cellar = tunnels'
      } else {
        const pad = pickCityLaunchPad()
        const building = getBuildingById(pad.buildingId)
        if (building) {
          cityLaunchPadId = pad.id
          cityLaunchLabel = pad.label
          const roofY = buildingRoofY(building, config.getHeight)
          flight = {
            ...flight,
            position: {
              x: building.x,
              y: roofY + GLIDER_REST_CLEARANCE,
              z: building.z,
            },
            yaw: pad.yaw,
            altitude: 0,
          }
        }
      }
    }
    set({
      screen: 'flight',
      flight,
      cityLaunchPadId,
      cityLaunchLabel,
      travelBanner,
      input: { ...INITIAL_INPUT },
      rings: initRings(biome),
      xcTask: get().mode === 'xc' ? buildXCTask(biome) : null,
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

  checkXC: () => {
    const { flight, mode, xcTask, simTime } = get()
    if (mode !== 'xc' || !xcTask || xcTask.completed) return
    if (flight.phase !== 'flying' && flight.phase !== 'parachuting') return

    let task = { ...xcTask, turnpoints: xcTask.turnpoints.map((t) => ({ ...t })) }
    if (task.startTime == null && flight.airtime > 1) {
      task = { ...task, startTime: simTime }
    }

    if (task.nextIndex < task.turnpoints.length) {
      const tp = task.turnpoints[task.nextIndex]
      const d = Math.hypot(
        flight.position.x - tp.position.x,
        flight.position.z - tp.position.z,
      )
      if (d <= tp.radius && flight.altitude >= tp.minAlt) {
        playRingSound()
        task.turnpoints[task.nextIndex] = { ...tp, tagged: true }
        task = { ...task, nextIndex: task.nextIndex + 1 }
      }
    } else {
      const g = task.goal
      const d = Math.hypot(
        flight.position.x - g.position.x,
        flight.position.z - g.position.z,
      )
      if (d <= g.radius && flight.altitude < 35) {
        playRingSound()
        task = {
          ...task,
          completed: true,
          finishTime: simTime,
        }
      }
    }
    set({ xcTask: task })
  },

  finishFlight: () => {
    const { flight, rings, mode, biome, xcTask } = get()
    const config = BIOME_CONFIGS[biome]
    let landingQuality = getLandingQuality(flight)

    if (
      mode === 'challenge' &&
      (flight.phase === 'landed' || flight.phase === 'walking')
    ) {
      const lz = config.landingZone
      const dx = flight.position.x - lz.center.x
      const dz = flight.position.z - lz.center.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist <= lz.radius * 1.35) {
        landingQuality = 'perfect'
      } else if (landingQuality == null) {
        landingQuality = 'good'
      }
    }

    if (mode === 'xc' && xcTask?.completed) {
      landingQuality = landingQuality ?? 'perfect'
    }

    const stats: FlightStats = {
      airtime: flight.airtime,
      maxAltitude: flight.maxAltitude,
      distance: flight.distance,
      maxClimbRate: flight.maxClimbRate,
      timeInLift: flight.timeInLift,
      ringsPassed: rings.filter((r) => r.passed).length,
      totalRings: rings.length,
      xcTurnpoints: xcTask?.turnpoints.filter((t) => t.tagged).length ?? 0,
      xcTotal: xcTask?.turnpoints.length ?? 0,
      xcGoal: xcTask?.completed ?? false,
      landingQuality,
      score: calcScore(flight, rings, mode, landingQuality, xcTask),
    }
    set({ stats, screen: 'result' })
  },

  endFlightFromWalk: () => {
    const { flight } = get()
    if (flight.phase !== 'walking' && flight.phase !== 'grounded' && flight.phase !== 'running') {
      return
    }
    if (flight.airtime < 2.5) return
    set({
      flight: {
        ...flight,
        phase: 'landed',
        airspeed: 0,
        velocity: { x: 0, y: 0, z: 0 },
        tandemRole: 'none',
        tandemWant: false,
      },
    })
    get().finishFlight()
  },

  goHome: () => {
    setRoomSession(null)
    set({
      screen: 'home',
      flight: { ...INITIAL_FLIGHT },
      input: { ...INITIAL_INPUT },
      stats: null,
      simTime: 0,
      xcTask: null,
      cityLaunchPadId: null,
      cityLaunchLabel: null,
      travelBanner: null,
      mapOpen: false,
      roomCode: null,
      roomRole: 'solo',
      roomStatus: '',
      peerConnected: false,
      remoteFlight: null,
      remoteName: '',
    })
  },

  setPlayerName: (name) => {
    const playerName = name.slice(0, 16)
    try {
      localStorage.setItem(PILOT_NAME_KEY, playerName)
    } catch {
      /* ignore quota / private mode */
    }
    set({ playerName })
  },

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
      xcTask: mode === 'xc' ? buildXCTask(biome) : null,
      parkedGliders: initParkedGliders(config),
    })
  },
}))

