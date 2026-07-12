import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { GliderModel } from './GliderModel'
import { AnimatedPilot, ParachuteCanopy, PILOT_HIP } from './Pilot'

/** Ghosted second player from the multiplayer room. */
export function RemotePlayer() {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const remote = useGameStore((s) => s.remoteFlight)
  const connected = useGameStore((s) => s.peerConnected)

  useFrame(() => {
    if (!group.current || !body.current || !remote) return
    group.current.position.set(remote.position.x, remote.position.y, remote.position.z)
    group.current.rotation.y = remote.yaw
    const onGround =
      remote.phase === 'grounded' ||
      remote.phase === 'running' ||
      remote.phase === 'landed' ||
      remote.phase === 'walking'
    body.current.rotation.set(
      onGround ? 0 : remote.pitch * 0.8,
      0,
      onGround ? 0 : -remote.roll,
    )
  })

  if (!connected || !remote) return null

  const phase = remote.phase
  const showWing =
    phase === 'grounded' || phase === 'running' || phase === 'flying' || phase === 'landed'
  const offGlider = phase === 'walking' || phase === 'freefall' || phase === 'parachuting'
  const showChute = phase === 'parachuting'
  const remoteMode =
    phase === 'walking'
      ? 'stand'
      : phase === 'freefall'
        ? 'freefall'
        : phase === 'parachuting'
          ? 'chute'
          : 'prone'

  return (
    <group ref={group}>
      <group ref={body}>
        {showWing && (
          <group>
            <GliderModel hidePilot />
            <group position={[0, -1.45, 0.1]}>
              <AnimatedPilot mode="prone" suitColor="#3d5a80" />
            </group>
          </group>
        )}
        {offGlider && (
          <group position={[0, phase === 'walking' ? 0 : -PILOT_HIP * 0.15, 0]}>
            <AnimatedPilot
              mode={remoteMode}
              suitColor="#3d5a80"
              motionSpeed={remote.airspeed}
              landAction={remote.landAction}
              chuteSwing={remote.chuteSwing}
              altitude={remote.altitude}
              airborneY={remote.velocity.y}
            />
          </group>
        )}
        {showChute && (
          <ParachuteCanopy inflation={remote.chuteInflation} swing={remote.chuteSwing} />
        )}
      </group>
    </group>
  )
}
