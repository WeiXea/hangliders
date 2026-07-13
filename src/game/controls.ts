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
import { addMouseLook, resetLook, setMouseLookHeld } from './lookCamera'
import { isPulseKey, pulseAction, clearAllPulses } from './actionPulses'

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
  KeyE: { interact: false, lookRight: false },
  KeyJ: { jump: false },
  Digit1: { emoteWave: false },
  Digit2: { emoteDance: false },
  Digit3: { emoteSit: false },
  Digit4: { emoteHug: false },
  Digit5: { emoteHighFive: false },
  KeyZ: { emoteWave: false },
  KeyX: { emoteDance: false },
  KeyV: { emoteSit: false },
  KeyH: { emoteHug: false },
  KeyY: { emoteHighFive: false },
  KeyT: { tandem: false },
  KeyQ: { lookLeft: false },
  KeyB: { lookBack: false },
  Comma: { lookLeft: false },
  Period: { lookRight: false },
  Slash: { lookBack: false },
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
        if (
          phase === 'walking' ||
          phase === 'flying' ||
          phase === 'helicopter' ||
          phase === 'driving'
        ) {
          pulseAction('jump')
          setInput({ jump: true })
        } else if (phase === 'freefall') {
          pulseAction('deployChute')
          setInput({ deployChute: true })
        } else {
          pulseAction('takeOff')
          setInput({ takeOff: true })
        }
        return
      }
      if (e.code === 'KeyJ') {
        e.preventDefault()
        pulseAction('jump')
        setInput({ jump: true })
        return
      }
      if (e.code === 'KeyF') {
        e.preventDefault()
        pulseAction('deployChute')
        setInput({ deployChute: true })
        return
      }
      if (e.code === 'KeyE') {
        e.preventDefault()
        const phase = useGameStore.getState().flight.phase
        if (
          phase === 'walking' ||
          phase === 'driving' ||
          phase === 'grounded' ||
          phase === 'running'
        ) {
          pulseAction('interact')
          setInput({ interact: true })
        } else {
          setInput({ lookRight: true })
        }
        return
      }
      if (e.code === 'KeyQ' || e.code === 'Comma') {
        e.preventDefault()
        setInput({ lookLeft: true })
        return
      }
      if (e.code === 'Period') {
        e.preventDefault()
        setInput({ lookRight: true })
        return
      }
      if (e.code === 'KeyB' || e.code === 'Slash') {
        e.preventDefault()
        setInput({ lookBack: true })
        return
      }
      if (e.code === 'Digit1' || e.code === 'KeyZ') {
        e.preventDefault()
        pulseAction('emoteWave')
        setInput({ emoteWave: true })
        return
      }
      if (e.code === 'Digit2' || e.code === 'KeyX') {
        e.preventDefault()
        pulseAction('emoteDance')
        setInput({ emoteDance: true })
        return
      }
      if (e.code === 'Digit3' || e.code === 'KeyV') {
        e.preventDefault()
        pulseAction('emoteSit')
        setInput({ emoteSit: true })
        return
      }
      if (e.code === 'Digit4' || e.code === 'KeyH') {
        e.preventDefault()
        pulseAction('emoteHug')
        setInput({ emoteHug: true })
        return
      }
      if (e.code === 'Digit5' || e.code === 'KeyY') {
        e.preventDefault()
        pulseAction('emoteHighFive')
        setInput({ emoteHighFive: true })
        return
      }
      if (e.code === 'KeyT') {
        e.preventDefault()
        pulseAction('tandem')
        setInput({ tandem: true })
        return
      }
      if (e.code === 'KeyL') {
        e.preventDefault()
        pulseAction('land')
        setInput({ land: true })
        return
      }

      // Alt / Option + arrows = look around (arrows alone still steer)
      if (e.altKey) {
        if (e.code === 'ArrowLeft') {
          e.preventDefault()
          setInput({ lookLeft: true, lookRight: false, lookBack: false })
          return
        }
        if (e.code === 'ArrowRight') {
          e.preventDefault()
          setInput({ lookRight: true, lookLeft: false, lookBack: false })
          return
        }
        if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
          e.preventDefault()
          setInput({ lookBack: true, lookLeft: false, lookRight: false })
          return
        }
      }

      // When tilt owns steering, skip keyboard pitch/bank (ground / drive / heli use keys)
      const phase = useGameStore.getState().flight.phase
      if (
        tiltEnabled &&
        phase !== 'walking' &&
        phase !== 'driving' &&
        phase !== 'helicopter' &&
        phase !== 'freefall' &&
        phase !== 'parachuting'
      ) {
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

      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        setInput({ lookLeft: false, lookRight: false, lookBack: false })
      }
      if (e.code === 'ArrowLeft') setInput({ lookLeft: false })
      if (e.code === 'ArrowRight') setInput({ lookRight: false })
      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') setInput({ lookBack: false })

      if (tiltEnabled) {
        const release = RELEASE_MAP[e.code]
        if (release) {
          const filtered: Partial<InputState> = {}
          for (const [k, v] of Object.entries(release)) {
            if (!isPulseKey(k)) (filtered as Record<string, boolean>)[k] = v as boolean
          }
          if (Object.keys(filtered).length) {
            e.preventDefault()
            setInput(filtered)
          }
        }
        const phase = useGameStore.getState().flight.phase
        if (
          phase !== 'walking' &&
          phase !== 'driving' &&
          phase !== 'helicopter' &&
          phase !== 'freefall' &&
          phase !== 'parachuting'
        ) {
          return
        }
      }
      const release = RELEASE_MAP[e.code]
      if (release) {
        e.preventDefault()
        // Don't clear one-shot pulses on keyup — the sim consumes them
        const filtered: Partial<InputState> = {}
        for (const [k, v] of Object.entries(release)) {
          if (!isPulseKey(k)) (filtered as Record<string, boolean>)[k] = v as boolean
        }
        if (Object.keys(filtered).length) setInput(filtered)
      }
    }

    const onBlur = () => {
      setInput({ ...INITIAL_INPUT })
      clearAllPulses()
      resetLook()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      clearAllPulses()
      resetLook()
    }
  }, [screen, setInput, cycleCamera, startFlight, goHome, tiltEnabled])
}

/** Hold right mouse button and drag to look around (desktop). */
export function useMouseLook() {
  const screen = useGameStore((s) => s.screen)

  useEffect(() => {
    if (screen !== 'flight') return

    const onDown = (e: PointerEvent) => {
      if (e.button !== 2 && e.button !== 1) return
      e.preventDefault()
      setMouseLookHeld(true)
    }
    const onUp = (e: PointerEvent) => {
      if (e.button !== 2 && e.button !== 1) return
      setMouseLookHeld(false)
    }
    const onMove = (e: PointerEvent) => {
      if ((e.buttons & 2) === 0 && (e.buttons & 4) === 0) return
      addMouseLook(e.movementX, e.movementY)
    }
    const onContext = (e: Event) => e.preventDefault()

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('contextmenu', onContext)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('contextmenu', onContext)
      setMouseLookHeld(false)
    }
  }, [screen])
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
      const phase = store.flight.phase
      // Keyboard / pads own these modes — don't clobber arrow keys
      if (
        phase === 'walking' ||
        phase === 'driving' ||
        phase === 'helicopter' ||
        phase === 'freefall' ||
        phase === 'parachuting'
      ) {
        return
      }
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
      if (isPulseKey(action)) pulseAction(action)
      setInput({ [action]: true })
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault()
      // One-shots stay until the sim frame clears them
      if (!isPulseKey(action)) setInput({ [action]: false })
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.preventDefault()
      if (!isPulseKey(action)) setInput({ [action]: false })
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault()
      if (!isPulseKey(action)) setInput({ [action]: false })
    },
  }
}
