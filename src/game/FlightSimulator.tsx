import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from './gameStore'
import { tickFlight, findNearestGlider } from './flightPhysics'
import { BIOME_CONFIGS } from './biomeConfigs'
import { tickNetSync } from './netSync'
import { bearingTo, horizontalDist, isOnGlider } from './multiplayerSocial'
import { TANDEM_RANGE, WALK_FEET } from '../types/game'
import { GROUND_CLEARANCE } from './obstacles'

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
    let { flight: current, parkedGliders, remoteFlight, peerConnected, roomRole } = store

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

    // Passenger rides the pilot's craft — copy remote state
    if (
      peerConnected &&
      remoteFlight &&
      current.tandemRole === 'passenger'
    ) {
      const pilotGone =
        remoteFlight.tandemRole !== 'pilot' ||
        remoteFlight.phase === 'walking' ||
        remoteFlight.phase === 'freefall' ||
        remoteFlight.phase === 'parachuting' ||
        remoteFlight.phase === 'crashed'

      if (pilotGone || input.tandem || input.jump) {
        const src = remoteFlight.tandemRole === 'pilot' ? remoteFlight : current
        const gy = config.getHeight(src.position.x, src.position.z)
        updateFlight({
          ...current,
          phase: 'walking',
          position: {
            x: src.position.x + Math.cos(src.yaw) * 2.2,
            y: gy + WALK_FEET,
            z: src.position.z - Math.sin(src.yaw) * 2.2,
          },
          velocity: { x: 0, y: 0, z: 0 },
          airspeed: 0,
          pitch: 0,
          roll: 0,
          altitude: 0,
          tandemRole: 'none',
          tandemWant: false,
          landAction: 'none',
          mountedId: -1,
        })
        useGameStore.getState().setInput({ tandem: false, jump: false })
        tickNetSync(dt)
        return
      }

      if (remoteFlight.tandemRole === 'pilot') {
        const followed = {
          ...remoteFlight,
          tandemRole: 'passenger' as const,
          tandemWant: current.tandemWant,
          landAction: current.landAction,
        }
        updateFlight(followed, parkedGliders)
        tickNetSync(dt)
        checkRings()
        return
      }
    }

    // If remote left tandem, clear local role
    if (
      current.tandemRole !== 'none' &&
      peerConnected &&
      remoteFlight &&
      remoteFlight.tandemRole === 'none' &&
      !remoteFlight.tandemWant
    ) {
      current = { ...current, tandemRole: 'none', tandemWant: false }
    }

    const { flight: next, parked } = tickFlight(
      current,
      input,
      config,
      dt,
      timeRef.current,
      parkedGliders,
    )
    let flight = next
    let parkedOut = parked

    // Face friend for hug / high-five
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

    // Form / maintain tandem when both want it
    if (peerConnected && remoteFlight) {
      const dist = horizontalDist(flight.position, remoteFlight.position)
      if (
        flight.tandemWant &&
        remoteFlight.tandemWant &&
        flight.tandemRole === 'none' &&
        remoteFlight.tandemRole === 'none' &&
        dist <= TANDEM_RANGE
      ) {
        const localGlider = isOnGlider(flight.phase)
        const remoteGlider = isOnGlider(remoteFlight.phase)
        let becomePilot = false
        if (localGlider && !remoteGlider) becomePilot = true
        else if (!localGlider && remoteGlider) becomePilot = false
        else if (!localGlider && !remoteGlider) {
          // Host pilots; if solo role somehow, first alphabetically by name
          becomePilot = roomRole === 'host' || roomRole === 'solo'
        } else {
          // Both already on separate gliders — host keeps pilot
          becomePilot = roomRole === 'host' || roomRole === 'solo'
        }

        if (becomePilot) {
          if (!localGlider) {
            const target = findNearestGlider(flight.position.x, flight.position.z, parkedOut)
            if (target) {
              parkedOut = parkedOut.map((g) =>
                g.id === target.id ? { ...g, available: false } : g,
              )
              const gy = config.getHeight(target.x, target.z)
              flight = {
                ...flight,
                phase: 'grounded',
                position: { x: target.x, y: gy + GROUND_CLEARANCE, z: target.z },
                yaw: target.yaw,
                pitch: 0,
                roll: 0,
                airspeed: 0,
                velocity: { x: 0, y: 0, z: 0 },
                altitude: 0,
                mountedId: target.id,
                landAction: 'none',
                tandemRole: 'pilot',
              }
            } else {
              // No parked glider — form tandem at current spot as grounded
              const gy = config.getHeight(flight.position.x, flight.position.z)
              flight = {
                ...flight,
                phase: 'grounded',
                position: { ...flight.position, y: gy + GROUND_CLEARANCE },
                pitch: 0,
                roll: 0,
                airspeed: 0,
                velocity: { x: 0, y: 0, z: 0 },
                altitude: 0,
                landAction: 'none',
                tandemRole: 'pilot',
              }
            }
          } else {
            flight = { ...flight, tandemRole: 'pilot', landAction: 'none' }
          }
        } else {
          flight = { ...flight, tandemRole: 'passenger', landAction: 'none' }
        }
      }

      // Pilot alone if friend cancelled
      if (flight.tandemRole === 'pilot' && !remoteFlight.tandemWant && remoteFlight.tandemRole === 'none') {
        flight = { ...flight, tandemRole: 'none', tandemWant: false }
      }
    }

    updateFlight(flight, parkedOut)
    tickNetSync(dt)
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
    checkRings()
  })

  return null
}
