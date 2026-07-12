import type { InputState, TiltPermission } from '../types/game'

const TILT_DEADZONE = 6
const TILT_ACTIVATE = 10
const TILT_STORAGE_KEY = 'hangglider-tilt'

type OrientPermission = {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export function isTiltSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

export function needsTiltPermission(): boolean {
  if (!isTiltSupported()) return false
  const DOE = DeviceOrientationEvent as unknown as OrientPermission
  return typeof DOE.requestPermission === 'function'
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
  const DOE = DeviceOrientationEvent as unknown as OrientPermission
  if (typeof DOE.requestPermission !== 'function') return 'granted'
  try {
    const result = await DOE.requestPermission()
    return result === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** Screen angle → portrait-relative bank (x) and pitch (y) in degrees. */
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
  return { bank: gamma, pitch: beta }
}

export function screenOrientationAngle(): number {
  const so = window.screen?.orientation
  if (so && typeof so.angle === 'number') return so.angle
  const legacy = (window as Window & { orientation?: number }).orientation
  return typeof legacy === 'number' ? legacy : 0
}

export function tiltToSteer(
  bank: number,
  pitch: number,
): Pick<InputState, 'pitchUp' | 'pitchDown' | 'bankLeft' | 'bankRight'> {
  const apply = (v: number) => {
    if (Math.abs(v) < TILT_DEADZONE) return 0
    if (v > TILT_ACTIVATE) return 1
    if (v < -TILT_ACTIVATE) return -1
    return 0
  }
  const b = apply(bank)
  const p = apply(pitch)
  return {
    bankLeft: b < 0,
    bankRight: b > 0,
    // Forward tilt (positive pitch after calib) → dive; back → climb
    pitchDown: p > 0,
    pitchUp: p < 0,
  }
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
