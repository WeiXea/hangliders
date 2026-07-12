import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from './gameStore'
import { tickFlight } from './flightPhysics'
import { BIOME_CONFIGS } from './biomeConfigs'
import { tickNetSync } from './netSync'
import { bearingTo, horizontalDist } from './multiplayerSocial'
import { resolveTandem } from './tandem'
import { applyPulses, clearPulses } from './actionPulses'

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
    const frameInput = applyPulses(input)

    if (current.phase === 'crashed' || current.phase === 'landed') {
      if (!finishedRef.current) {
        finishedRef.current = true
        finishFlight()
      }
      clearPulses()
      return
    }

    let flight = current
    let parkedOut = parkedGliders

    if (peerConnected && remoteFlight) {
      const tandem = resolveTandem(
        current,
        remoteFlight,
        frameInput,
        parkedGliders,
        config,
        dt,
      )
      flight = tandem.flight
      parkedOut = tandem.parked

      if (tandem.followPilot) {
        updateFlight(flight, parkedOut)
        tickNetSync(dt)
        finishInput(frameInput)
        checkRings()
        return
      }
    }

    // Pilot jump must reach physics even while marked tandem pilot
    const physicsInput: typeof frameInput = {
      ...frameInput,
      tandem: false,
      jump:
        frameInput.jump &&
        !(current.tandemRole === 'passenger' && flight.phase === 'freefall'),
    }

    const { flight: next, parked } = tickFlight(
      flight,
      physicsInput,
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

    // Promote to pilot if friend boarded (no input)
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

    updateFlight(flight, parkedOut)
    tickNetSync(dt)
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
