import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from './gameStore'
import { tickFlight } from './flightPhysics'
import { BIOME_CONFIGS } from './biomeConfigs'
import { tickNetSync } from './netSync'

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

    const { flight: current, parkedGliders } = useGameStore.getState()
    if (current.phase === 'crashed') {
      if (!finishedRef.current) {
        finishedRef.current = true
        finishFlight()
      }
      return
    }
    if (current.phase === 'landed') {
      if (!finishedRef.current) {
        finishedRef.current = true
        finishFlight()
      }
      return
    }

    const { flight: next, parked } = tickFlight(
      current,
      input,
      config,
      dt,
      timeRef.current,
      parkedGliders,
    )
    updateFlight(next, parked)
    tickNetSync(dt)
    // One-shot actions
    if (input.jump || input.deployChute || input.interact || input.emoteWave || input.emoteDance || input.emoteSit) {
      useGameStore.getState().setInput({
        jump: false,
        deployChute: false,
        interact: false,
        emoteWave: false,
        emoteDance: false,
        emoteSit: false,
      })
    }
    checkRings()
  })

  return null
}
