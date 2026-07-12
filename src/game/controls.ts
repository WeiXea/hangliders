import { useEffect } from 'react'
import { useGameStore } from './gameStore'
import { INITIAL_INPUT } from '../types/game'
import type { InputState } from '../types/game'
import {
  clearSteerInput,
  getLatestTiltSample,
  gravityToAxes,
  orientationAxes,
  screenOrientationAngle,
  setLatestTiltSample,
  steerFromSample,
} from './tilt'

const PITCH_BANK_DOWN: Record<string, Partial<InputState>> = {
  ArrowUp: { pitchDown: true },
  KeyW: { pitchDown: true },
}

const PITCH_BANK_UP: Record<string, Partial<InputState>> = {
  ArrowDown: { pitchUp: true },
  KeyS: { pitchUp: true },
}

const BANK_LEFT: Record<string, Partial<InputState>> = {
  ArrowLeft: { bankLeft: true },
  KeyA: { bankLeft: true },
}

const BANK_RIGHT: Record<string, Partial<InputState>> = {
  ArrowRight: { bankRight: true },
  KeyD: { bankRight: true },
}

const RELEASE_MAP: Record<string, Partial<InputState>> = {
  ArrowUp: { pitchDown: false },
  KeyW: { pitchDown: false },
  ArrowDown: { pitchUp: false },
  KeyS: { pitchUp: false },
  ArrowLeft: { bankLeft: false },
  KeyA: { bankLeft: false },
  ArrowRight: { bankRight: false },
  KeyD: { bankRight: false },
  Space: { takeOff: false, jump: false },
  KeyL: { land: false },
  KeyF: { deployChute: false },
  KeyE: { interact: false },
  KeyJ: { jump: false },
}

function syncModifiers(e: KeyboardEvent, setInput: (p: Partial<InputState>) => void) {
  setInput({
    speedUp: e.shiftKey,
    speedDown: e.ctrlKey,
  })
}

export function useKeyboardControls() {
  const setInput = useGameStore((s) => s.setInput)
  const cycleCamera = useGameStore((s) => s.cycleCamera)
  const startFlight = useGameStore((s) => s.startFlight)
  const goHome = useGameStore((s) => s.goHome)
  const screen = useGameStore((s) => s.screen)
  const tiltEnabled = useGameStore((s) => s.tiltEnabled)

  useEffect(() => {
    if (screen !== 'flight' && screen !== 'result') return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'KeyR') {
        e.preventDefault()
        startFlight()
        return
      }
      if (e.code === 'Escape') {
        e.preventDefault()
        goHome()
        return
      }

      if (screen !== 'flight') return

      syncModifiers(e, setInput)

      if (e.code === 'KeyC') {
        e.preventDefault()
        cycleCamera()
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        const phase = useGameStore.getState().flight.phase
        if (phase === 'walking' || phase === 'flying') {
          setInput({ jump: true })
        } else if (phase === 'freefall') {
          setInput({ deployChute: true })
        } else {
          setInput({ takeOff: true })
        }
        return
      }
      if (e.code === 'KeyJ') {
        e.preventDefault()
        setInput({ jump: true })
        return
      }
      if (e.code === 'KeyF') {
        e.preventDefault()
        setInput({ deployChute: true })
        return
      }
      if (e.code === 'KeyE') {
        e.preventDefault()
        setInput({ interact: true })
        return
      }
      if (e.code === 'KeyL') {
        e.preventDefault()
        setInput({ land: true })
        return
      }

      // When tilt owns steering, skip keyboard pitch/bank (walk still uses WASD)
      const phase = useGameStore.getState().flight.phase
      if (tiltEnabled && phase !== 'walking' && phase !== 'freefall' && phase !== 'parachuting') {
        return
      }

      const action =
        PITCH_BANK_DOWN[e.code] ??
        PITCH_BANK_UP[e.code] ??
        BANK_LEFT[e.code] ??
        BANK_RIGHT[e.code]

      if (action) {
        e.preventDefault()
        setInput(action)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (screen !== 'flight') return
      syncModifiers(e, setInput)
      if (tiltEnabled) {
        const release = RELEASE_MAP[e.code]
        if (
          release &&
          ('takeOff' in release ||
            'land' in release ||
            'jump' in release ||
            'deployChute' in release ||
            'interact' in release)
        ) {
          e.preventDefault()
          setInput(release)
        }
        const phase = useGameStore.getState().flight.phase
        if (phase !== 'walking' && phase !== 'freefall' && phase !== 'parachuting') {
          return
        }
      }
      const release = RELEASE_MAP[e.code]
      if (release) {
        e.preventDefault()
        setInput(release)
      }
    }

    const onBlur = () => setInput({ ...INITIAL_INPUT })

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [screen, setInput, cycleCamera, startFlight, goHome, tiltEnabled])
}

export function useTiltControls() {
  const setInput = useGameStore((s) => s.setInput)
  const screen = useGameStore((s) => s.screen)
  const tiltEnabled = useGameStore((s) => s.tiltEnabled)
  const tiltPermission = useGameStore((s) => s.tiltPermission)
  const setTiltCalibration = useGameStore((s) => s.setTiltCalibration)

  useEffect(() => {
    if (screen !== 'flight' || !tiltEnabled || tiltPermission !== 'granted') {
      return
    }

    const applySample = (raw: { bank: number; pitch: number }) => {
      setLatestTiltSample(raw)
      const store = useGameStore.getState()
      let offset = store.tiltCalibration
      if (!offset) {
        offset = { bank: raw.bank, pitch: raw.pitch }
        setTiltCalibration(offset)
      }
      setInput(steerFromSample(raw, offset))
    }

    const onMotion = (e: DeviceMotionEvent) => {
      const g = e.accelerationIncludingGravity
      if (!g || g.x == null || g.y == null || g.z == null) return
      lastMotionAt = performance.now()
      applySample(gravityToAxes(g.x, g.y, g.z, screenOrientationAngle()))
    }

    let lastMotionAt = 0

    const onOrient = (e: DeviceOrientationEvent) => {
      // Prefer accelerometer; fall back to orientation if motion is silent
      if (performance.now() - lastMotionAt < 400) return
      if (e.beta == null || e.gamma == null) return
      applySample(orientationAxes(e.beta, e.gamma, screenOrientationAngle()))
    }

    const onHidden = () => {
      if (document.hidden) setInput(clearSteerInput())
    }

    window.addEventListener('devicemotion', onMotion)
    window.addEventListener('deviceorientation', onOrient)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('devicemotion', onMotion)
      window.removeEventListener('deviceorientation', onOrient)
      document.removeEventListener('visibilitychange', onHidden)
      setLatestTiltSample(null)
      setInput(clearSteerInput())
    }
  }, [screen, tiltEnabled, tiltPermission, setInput, setTiltCalibration])
}

/** Recapture the current hold angle as neutral. Call from a button tap. */
export function calibrateTiltNow() {
  const latest = getLatestTiltSample()
  if (latest) {
    useGameStore.getState().setTiltCalibration({ bank: latest.bank, pitch: latest.pitch })
    return
  }

  const onMotion = (e: DeviceMotionEvent) => {
    const g = e.accelerationIncludingGravity
    if (!g || g.x == null || g.y == null || g.z == null) return
    const raw = gravityToAxes(g.x, g.y, g.z, screenOrientationAngle())
    useGameStore.getState().setTiltCalibration({ bank: raw.bank, pitch: raw.pitch })
    window.removeEventListener('devicemotion', onMotion)
  }
  window.addEventListener('devicemotion', onMotion)
  window.setTimeout(() => window.removeEventListener('devicemotion', onMotion), 800)
}

export function useTouchControl(
  action: keyof InputState,
) {
  const setInput = useGameStore((s) => s.setInput)

  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      setInput({ [action]: true })
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault()
      setInput({ [action]: false })
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.preventDefault()
      setInput({ [action]: false })
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault()
      setInput({ [action]: false })
    },
  }
}
