export type Biome = 'beach' | 'mountains' | 'city'
export type GameMode = 'free' | 'challenge'
export type Screen = 'home' | 'flight' | 'result'
export type FlightPhase =
  | 'grounded'
  | 'running'
  | 'flying'
  | 'freefall'
  | 'parachuting'
  | 'walking'
  | 'landed'
  | 'crashed'
export type CameraMode = 'chase' | 'fpv' | 'side'
export type TiltPermission = 'unknown' | 'granted' | 'denied'
export type LandAction = 'none' | 'wave' | 'dance' | 'sit' | 'hug' | 'highfive'
export type TandemRole = 'none' | 'pilot' | 'passenger'

export interface TiltCalibration {
  bank: number
  pitch: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface ParkedGlider {
  id: number
  x: number
  z: number
  yaw: number
  /** false once the player mounts this one (respawns on restart) */
  available: boolean
}

export interface FlightState {
  position: Vec3
  velocity: Vec3
  pitch: number
  roll: number
  yaw: number
  airspeed: number
  phase: FlightPhase
  runProgress: number
  stallWarning: boolean
  altitude: number
  distance: number
  maxAltitude: number
  airtime: number
  /** Peak climb rate (m/s) this flight */
  maxClimbRate: number
  /** Seconds spent in rising air / climbing */
  timeInLift: number
  /** Which parked glider is currently mounted (-1 = launch ramp) */
  mountedId: number
  chuteDeployed: boolean
  /** 0 = packed, 1 = fully open */
  chuteInflation: number
  /** Pendulum lean while under canopy (radians) */
  chuteSwing: number
  landAction: LandAction
  /** Multiplayer: riding the same glider */
  tandemRole: TandemRole
  /** Multiplayer: pressed Tandem — pairs when both want it nearby */
  tandemWant: boolean
}

export interface InputState {
  pitchUp: boolean
  pitchDown: boolean
  bankLeft: boolean
  bankRight: boolean
  speedUp: boolean
  speedDown: boolean
  takeOff: boolean
  land: boolean
  jump: boolean
  deployChute: boolean
  interact: boolean
  emoteWave: boolean
  emoteDance: boolean
  emoteSit: boolean
  emoteHug: boolean
  emoteHighFive: boolean
  tandem: boolean
  lookLeft: boolean
  lookRight: boolean
  lookBack: boolean
}

export interface ChallengeRing {
  id: number
  position: Vec3
  radius: number
  passed: boolean
}

export interface FlightStats {
  airtime: number
  maxAltitude: number
  distance: number
  maxClimbRate: number
  timeInLift: number
  ringsPassed: number
  totalRings: number
  landingQuality: 'perfect' | 'good' | 'hard' | 'crash' | null
  score: number
}

export interface BiomeConfig {
  id: Biome
  name: string
  tagline: string
  launchPosition: Vec3
  launchYaw: number
  windStrength: number
  thermalStrength: number
  fogColor: string
  fogNear: number
  fogFar: number
  skyTurbidity: number
  skyRayleigh: number
  sunPosition: [number, number, number]
  getHeight: (x: number, z: number) => number
  challengeRings: Vec3[]
  landingZone: { center: Vec3; radius: number }
  parkedGliders: { x: number; z: number; yaw: number }[]
}

export const JUMP_MIN_ALTITUDE = 15
export const MOUNT_RANGE = 6
/** Standing pilots can hug / high-five within this range */
export const SOCIAL_RANGE = 5.5
/** Must be this close to form a tandem pair */
export const TANDEM_RANGE = 18
/** Standing pilot: physics Y is soles of the feet (+ tiny clearance) */
export const WALK_FEET = 0.04

export const INITIAL_FLIGHT: FlightState = {
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  pitch: 0,
  roll: 0,
  yaw: 0,
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
}

export const INITIAL_INPUT: InputState = {
  pitchUp: false,
  pitchDown: false,
  bankLeft: false,
  bankRight: false,
  speedUp: false,
  speedDown: false,
  takeOff: false,
  land: false,
  jump: false,
  deployChute: false,
  interact: false,
  emoteWave: false,
  emoteDance: false,
  emoteSit: false,
  emoteHug: false,
  emoteHighFive: false,
  tandem: false,
  lookLeft: false,
  lookRight: false,
  lookBack: false,
}
