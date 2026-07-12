import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from './gameStore'
import { tickFlight } from './flightPhysics'
import { BIOME_CONFIGS } from './biomeConfigs'
import { tickNetSync } from './netSync'
import { bearingTo, horizontalDist } from './multiplayerSocial'
import { resolveTandem } from './tandem'
import { applyPulses, clearPulses } from './actionPulses'
import { tickVario } from './audio'

const FIXED_DT = 1 / 60
const MAX_STEPS = 5

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
  const accRef = useRef(0)

  useEffect(() => {
    if (screen === 'flight') {
      finishedRef.current = false
      timeRef.current = 0
      accRef.current = 0
    }
  }, [screen])

  useFrame((_, delta) => {
    const frameDt = Math.min(delta, 0.05)
    accRef.current += frameDt

    const store = useGameStore.getState()
    const { flight: startFlight, parkedGliders, remoteFlight, peerConnected } = store
    const frameInput = applyPulses(input)

    if (startFlight.phase === 'crashed' || startFlight.phase === 'landed') {
      if (!finishedRef.current) {
        finishedRef.current = true
        finishFlight()
      }
      clearPulses()
      return
    }

    let flight = startFlight
    let parkedOut = parkedGliders
    let steps = 0

    while (accRef.current >= FIXED_DT && steps < MAX_STEPS) {
      accRef.current -= FIXED_DT
      steps += 1
      timeRef.current += FIXED_DT
      setSimTime(timeRef.current)

      if (peerConnected && remoteFlight) {
        const tandem = resolveTandem(
          flight,
          remoteFlight,
          frameInput,
          parkedOut,
          config,
          FIXED_DT,
        )
        flight = tandem.flight
        parkedOut = tandem.parked

        if (tandem.followPilot) {
          tickNetSync(FIXED_DT)
          continue
        }
      }

      const physicsInput = {
        ...frameInput,
        tandem: false,
        jump:
          frameInput.jump &&
          !(flight.tandemRole === 'passenger' && flight.phase === 'freefall'),
      }

      const { flight: next, parked } = tickFlight(
        flight,
        physicsInput,
        config,
        FIXED_DT,
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

      if (
        peerConnected &&
        remoteFlight &&
        remoteFlight.tandemRole === 'passenger' &&
        flight.tandemRole !== 'passenger' &&
        (flight.phase === 'grounded' ||
          flight.phase === 'running' ||
          flight.phase === 'flying' ||
          flight.phase === 'landed')
      ) {
        flight = { ...flight, tandemRole: 'pilot', tandemWant: false }
      }

      tickNetSync(FIXED_DT)
    }

    // Display-rate passenger follow when no fixed step ran this frame
    if (
      steps === 0 &&
      peerConnected &&
      remoteFlight &&
      startFlight.tandemRole === 'passenger'
    ) {
      const tandem = resolveTandem(
        startFlight,
        remoteFlight,
        frameInput,
        parkedOut,
        config,
        frameDt,
      )
      flight = tandem.flight
      parkedOut = tandem.parked
    }

    updateFlight(flight, parkedOut)
    tickVario(flight.velocity.y, flight.phase)
    finishInput(frameInput)
    checkRings()
  })

  return null
}

function finishInput(frameInput: {
  jump: boolean
  deployChute: boolean
  interact: boolean
  emoteWave: boolean
  emoteDance: boolean
  emoteSit: boolean
  emoteHug: boolean
  emoteHighFive: boolean
  tandem: boolean
  takeOff: boolean
  land: boolean
}) {
  clearPulses()
  const clear: Partial<{
    jump: boolean
    deployChute: boolean
    interact: boolean
    emoteWave: boolean
    emoteDance: boolean
    emoteSit: boolean
    emoteHug: boolean
    emoteHighFive: boolean
    tandem: boolean
    takeOff: boolean
    land: boolean
  }> = {}
  let any = false
  for (const key of [
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
  ] as const) {
    if (frameInput[key] || useGameStore.getState().input[key]) {
      clear[key] = false
      any = true
    }
  }
  if (any) useGameStore.getState().setInput(clear)
}
