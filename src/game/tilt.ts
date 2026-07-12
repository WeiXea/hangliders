import type { InputState, TiltPermission } from '../types/game'

/** Degrees of wheel turn before input engages (after calibration). */
const BANK_DEADZONE = 5
const BANK_ACTIVATE = 8
/** Degrees of push/pull from level for pitch. */
const PITCH_DEADZONE = 6
const PITCH_ACTIVATE = 10
const TILT_STORAGE_KEY = 'hangglider-tilt'
const RAD2DEG = 180 / Math.PI

type OrientPermission = {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export function isTiltSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window)
  )
}

export function needsTiltPermission(): boolean {
  if (!isTiltSupported()) return false
  const DME = DeviceMotionEvent as unknown as OrientPermission
  const DOE = DeviceOrientationEvent as unknown as OrientPermission
  return (
    typeof DME.requestPermission === 'function' ||
    typeof DOE.requestPermission === 'function'
  )
}

export function readStoredTiltPreference(): boolean {
  try {
    return localStorage.getItem(TILT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeStoredTiltPreference(enabled: boolean) {
  try {
    localStorage.setItem(TILT_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export async function requestTiltPermission(): Promise<TiltPermission> {
  if (!isTiltSupported()) return 'denied'

  const DME = DeviceMotionEvent as unknown as OrientPermission
  const DOE = DeviceOrientationEvent as unknown as OrientPermission

  try {
    // iOS: motion permission covers the accelerometer used for steering-wheel tilt
    if (typeof DME.requestPermission === 'function') {
      const result = await DME.requestPermission()
      if (result !== 'granted') return 'denied'
      return 'granted'
    }
    if (typeof DOE.requestPermission === 'function') {
      const result = await DOE.requestPermission()
      return result === 'granted' ? 'granted' : 'denied'
    }
    return 'granted'
  } catch {
    return 'denied'
  }
}

export function screenOrientationAngle(): number {
  const so = window.screen?.orientation
  if (so && typeof so.angle === 'number') return so.angle
  const legacy = (window as Window & { orientation?: number }).orientation
  if (typeof legacy === 'number') return legacy
  // PWA / Safari sometimes omit angle — infer from layout
  return window.innerWidth >= window.innerHeight ? 90 : 0
}

/**
 * Map device-frame gravity into screen-frame (sx right, sy up, sz toward user).
 */
function gravityToScreen(ax: number, ay: number, az: number, screenAngle: number) {
  const angle = ((screenAngle % 360) + 360) % 360
  if (angle >= 45 && angle < 135) {
    // Landscape, home/notch on the right
    return { sx: ay, sy: -ax, sz: az }
  }
  if (angle >= 135 && angle < 225) {
    // Upside-down portrait
    return { sx: -ax, sy: -ay, sz: az }
  }
  if (angle >= 225 && angle < 315) {
    // Landscape, home/notch on the left
    return { sx: -ay, sy: ax, sz: az }
  }
  return { sx: ax, sy: ay, sz: az }
}

/**
 * Steering-wheel model: hold the iPad in landscape facing you.
 * - bank = turn the wheel left/right (raise one hand, lower the other)
 * - pitch = pull top toward chest / push top away (climb / dive)
 */
export function gravityToAxes(ax: number, ay: number, az: number, screenAngle: number) {
  const { sx, sy, sz } = gravityToScreen(ax, ay, az, screenAngle)
  // "Down" along the face: prefer screen-down when upright, toward-back when flatter
  const down = Math.abs(sy) >= Math.abs(sz) ? -sy : -sz
  const bank = Math.atan2(sx, down) * RAD2DEG
  // Pull toward chest (screen leans back toward pilot) → positive pitch → climb
  const pitch = Math.atan2(sz, Math.hypot(sx, sy)) * RAD2DEG
  return { bank, pitch }
}

/** Fallback when motion events are unavailable. */
export function orientationAxes(beta: number, gamma: number, screenAngle: number) {
  const angle = ((screenAngle % 360) + 360) % 360
  if (angle >= 45 && angle < 135) {
    return { bank: beta, pitch: -gamma }
  }
  if (angle >= 135 && angle < 225) {
    return { bank: -gamma, pitch: -beta }
  }
  if (angle >= 225 && angle < 315) {
    return { bank: -beta, pitch: gamma }
  }
  // Infer landscape from viewport when angle stuck at 0
  if (typeof window !== 'undefined' && window.innerWidth >= window.innerHeight) {
    return { bank: beta, pitch: -gamma }
  }
  return { bank: gamma, pitch: beta }
}

function deltaAngle(value: number, origin: number) {
  let d = value - origin
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

export function tiltToSteer(
  bank: number,
  pitch: number,
): Pick<InputState, 'pitchUp' | 'pitchDown' | 'bankLeft' | 'bankRight'> {
  const applyBank = (v: number) => {
    if (Math.abs(v) < BANK_DEADZONE) return 0
    if (v > BANK_ACTIVATE) return 1
    if (v < -BANK_ACTIVATE) return -1
    return 0
  }
  const applyPitch = (v: number) => {
    if (Math.abs(v) < PITCH_DEADZONE) return 0
    if (v > PITCH_ACTIVATE) return 1
    if (v < -PITCH_ACTIVATE) return -1
    return 0
  }
  const b = applyBank(bank)
  const p = applyPitch(pitch)
  return {
    // Positive bank = clockwise wheel turn = bank right
    bankLeft: b < 0,
    bankRight: b > 0,
    // Positive pitch = top toward chest / pull back = climb
    pitchUp: p > 0,
    pitchDown: p < 0,
  }
}

export function steerFromSample(
  raw: { bank: number; pitch: number },
  offset: { bank: number; pitch: number },
) {
  return tiltToSteer(deltaAngle(raw.bank, offset.bank), deltaAngle(raw.pitch, offset.pitch))
}

export function clearSteerInput(): Pick<
  InputState,
  'pitchUp' | 'pitchDown' | 'bankLeft' | 'bankRight'
> {
  return {
    pitchUp: false,
    pitchDown: false,
    bankLeft: false,
    bankRight: false,
  }
}

export type TiltSample = { bank: number; pitch: number }

/** Latest raw sample — used so Level can calibrate without waiting for a new event. */
let latestSample: TiltSample | null = null

export function getLatestTiltSample() {
  return latestSample
}

export function setLatestTiltSample(sample: TiltSample | null) {
  latestSample = sample
}
