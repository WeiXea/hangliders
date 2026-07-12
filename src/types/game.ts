export type Biome = 'beach' | 'mountains' | 'city'
export type GameMode = 'free' | 'challenge'
export type Screen = 'home' | 'flight' | 'result'
export type FlightPhase = 'grounded' | 'running' | 'flying' | 'landed' | 'crashed'
export type CameraMode = 'chase' | 'fpv' | 'side'
export type TiltPermission = 'unknown' | 'granted' | 'denied'

export interface TiltCalibration {
  bank: number
  pitch: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
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
}

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
}
