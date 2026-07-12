import { useEffect } from 'react'
import { useGameStore } from './gameStore'
import { INITIAL_INPUT } from '../types/game'
import type { InputState } from '../types/game'

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
  Space: { takeOff: false },
  KeyL: { land: false },
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

  useEffect(() => {
    if (screen !== 'flight' && screen !== 'result') return

    const onKeyDown = (e: KeyboardEvent) => {
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
        setInput({ takeOff: true })
        return
      }
      if (e.code === 'KeyL') {
        e.preventDefault()
        setInput({ land: true })
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
  }, [screen, setInput, cycleCamera, startFlight, goHome])
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
