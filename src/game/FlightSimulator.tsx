import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from './gameStore'
import { tickFlight } from './flightPhysics'
import { BIOME_CONFIGS } from './biomeConfigs'
import { tickNetSync } from './netSync'
import { bearingTo, horizontalDist } from './multiplayerSocial'
import { resolveTandem } from './tandem'
import { INITIAL_INPUT } from '../types/game'

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

    const store = useGameStore.getState()
    const { flight: current, parkedGliders, remoteFlight, peerConnected } = store

    if (current.phase === 'crashed' || current.phase === 'landed') {
      if (!finishedRef.current) {
        finishedRef.current = true
        finishFlight()
      }
      return
    }

    let flight = current
    let parkedOut = parkedGliders

    if (peerConnected && remoteFlight) {
      const tandem = resolveTandem(current, remoteFlight, input, parkedGliders, config)
      flight = tandem.flight
      parkedOut = tandem.parked

      if (tandem.followPilot) {
        updateFlight(flight, parkedOut)
        tickNetSync(dt)
        clearOneShots()
        checkRings()
        return
      }
    }

    const { flight: next, parked } = tickFlight(
      flight,
      { ...input, tandem: false },
      config,
      dt,
      timeRef.current,
      parkedOut,
    )
    flight = next
    parkedOut = parked

    if (
      peerConnected &&
      remoteFlight &&
      flight.phase === 'walking' &&
      remoteFlight.phase === 'walking' &&
      (flight.landAction === 'hug' || flight.landAction === 'highfive')
    ) {
      const d = horizontalDist(flight.position, remoteFlight.position)
      if (d < 4) {
        flight = {
          ...flight,
          yaw: bearingTo(flight.position, remoteFlight.position),
        }
      }
    }

    // Catch auto-board / pilot promote after physics moved us
    if (peerConnected && remoteFlight) {
      const tandem = resolveTandem(
        flight,
        remoteFlight,
        { ...INITIAL_INPUT },
        parkedOut,
        config,
      )
      if (tandem.followPilot || tandem.flight.tandemRole !== flight.tandemRole) {
        flight = tandem.flight
        parkedOut = tandem.parked
        if (tandem.followPilot) {
          updateFlight(flight, parkedOut)
          tickNetSync(dt)
          clearOneShots()
          checkRings()
          return
        }
      }
    }

    updateFlight(flight, parkedOut)
    tickNetSync(dt)
    clearOneShots()
    checkRings()
  })

  return null
}

function clearOneShots() {
  const input = useGameStore.getState().input
  if (
    input.jump ||
    input.deployChute ||
    input.interact ||
    input.emoteWave ||
    input.emoteDance ||
    input.emoteSit ||
    input.emoteHug ||
    input.emoteHighFive ||
    input.tandem
  ) {
    useGameStore.getState().setInput({
      jump: false,
      deployChute: false,
      interact: false,
      emoteWave: false,
      emoteDance: false,
      emoteSit: false,
      emoteHug: false,
      emoteHighFive: false,
      tandem: false,
    })
  }
}
