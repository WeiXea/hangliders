import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from './gameStore'
import { tickFlight } from './flightPhysics'
import { BIOME_CONFIGS } from './biomeConfigs'
import { tickNetSync } from './netSync'
import { bearingTo, horizontalDist } from './multiplayerSocial'
import { resolveTandem } from './tandem'
import { applyPulses, clearPulses } from './actionPulses'
import { tickVario, tickFootsteps, noteInteractPress } from './audio'
import { thermalHint } from './atmosphere'
import type { InputState } from '../types/game'

const FIXED_DT = 1 / 60
const MAX_STEPS = 5

/** One-shots must only fire on the first fixed step of a frame. */
function stripOneShots(input: InputState): InputState {
  return {
    ...input,
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
}

export function FlightSimulator() {
  const biome = useGameStore((s) => s.biome)
  const screen = useGameStore((s) => s.screen)
  const updateFlight = useGameStore((s) => s.updateFlight)
  const checkRings = useGameStore((s) => s.checkRings)
  const checkXC = useGameStore((s) => s.checkXC)
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
    // Always read live input — React closure can lag one frame behind keydown
    const frameInput = applyPulses(store.input)

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
    // Same pressed T/emote must not re-fire on extra catch-up steps
    let stepInput = frameInput

    while (accRef.current >= FIXED_DT && steps < MAX_STEPS) {
      accRef.current -= FIXED_DT
      steps += 1
      timeRef.current += FIXED_DT
      setSimTime(timeRef.current)

      if (peerConnected && remoteFlight) {
        const tandem = resolveTandem(
          flight,
          remoteFlight,
          stepInput,
          parkedOut,
          config,
          FIXED_DT,
        )
        flight = tandem.flight
        parkedOut = tandem.parked

        if (tandem.followPilot) {
          stepInput = stripOneShots(stepInput)
          tickNetSync(FIXED_DT)
          continue
        }
      }

      const physicsInput = {
        ...stepInput,
        tandem: false,
        jump:
          stepInput.jump &&
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

      stepInput = stripOneShots(stepInput)
      tickNetSync(FIXED_DT)
    }

    // Display-rate passenger follow — no one-shots (avoid leave/board on render ticks)
    if (
      steps === 0 &&
      peerConnected &&
      remoteFlight &&
      startFlight.tandemRole === 'passenger'
    ) {
      const tandem = resolveTandem(
        startFlight,
        remoteFlight,
        stripOneShots(frameInput),
        parkedOut,
        config,
        frameDt,
      )
      flight = tandem.flight
      parkedOut = tandem.parked
    }

    updateFlight(flight, parkedOut)
    const liftHint =
      flight.phase === 'flying'
        ? thermalHint(config, useGameStore.getState().simTime, flight.position)
        : 0
    tickVario(flight.velocity.y, flight.phase, liftHint)
    const sprint = frameInput.speedUp
    const surface =
      store.biome === 'city' ? 'city' : store.biome === 'mountains' ? 'grass' : 'sand'
    tickFootsteps(flight.airspeed, flight.phase, sprint, surface)
    noteInteractPress(frameInput.interact)
    // Hold one-shot pulses until a fixed step actually consumes them
    if (steps > 0) finishInput(frameInput)
    checkRings()
    checkXC()
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
