import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from './gameStore'
import { tickFlight } from './flightPhysics'
import { BIOME_CONFIGS } from './biomeConfigs'

export function FlightSimulator() {
  const biome = useGameStore((s) => s.biome)
  const input = useGameStore((s) => s.input)
  const screen = useGameStore((s) => s.screen)
  const updateFlight = useGameStore((s) => s.updateFlight)
  const checkRings = useGameStore((s) => s.checkRings)
  const finishFlight = useGameStore((s) => s.finishFlight)
  const setSimTime = useGameStore((s) => s.setSimTime)
  const config = BIOME_CONFIGS[biome]
  const timeRef = useRef(0)
  const finishedRef = useRef(false)

  useEffect(() => {
    if (screen === 'flight') {
      finishedRef.current = false
      timeRef.current = 0
    }
  }, [screen])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timeRef.current += dt
    setSimTime(timeRef.current)

    const current = useGameStore.getState().flight
    if (current.phase === 'landed' || current.phase === 'crashed') {
      if (!finishedRef.current) {
        finishedRef.current = true
        finishFlight()
      }
      return
    }

    const next = tickFlight(current, input, config, dt, timeRef.current)
    updateFlight(next)
    checkRings()
  })

  return null
}
