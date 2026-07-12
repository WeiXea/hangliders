import type { InputState } from '../types/game'

/** One-shot actions that must survive until the sim frame consumes them. */
const PULSE_KEYS = [
  'jump',
  'deployChute',
  'interact',
  'emoteWave',
  'emoteDance',
  'emoteSit',
  'emoteHug',
  'emoteHighFive',
  'tandem',
  'takeOff',
  'land',
] as const

type PulseKey = (typeof PULSE_KEYS)[number]

const pending: Record<PulseKey, boolean> = {
  jump: false,
  deployChute: false,
  interact: false,
  emoteWave: false,
  emoteDance: false,
  emoteSit: false,
  emoteHug: false,
  emoteHighFive: false,
  tandem: false,
  takeOff: false,
  land: false,
}

export function pulseAction(key: PulseKey) {
  pending[key] = true
}

export function isPulseKey(key: string): key is PulseKey {
  return (PULSE_KEYS as readonly string[]).includes(key)
}

/** Merge latched pulses into input for this sim tick. */
export function applyPulses(input: InputState): InputState {
  const next: InputState = { ...input }
  for (const key of PULSE_KEYS) {
    if (pending[key]) next[key] = true
  }
  return next
}

/** Clear pulses after the sim has consumed this frame's input. */
export function clearPulses() {
  for (const key of PULSE_KEYS) pending[key] = false
}

export function clearAllPulses() {
  clearPulses()
}
