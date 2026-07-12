import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { GliderModel } from './GliderModel'
import { AnimatedPilot, ParachuteCanopy, PILOT_HIP } from './Pilot'
import { predictedRemote } from './remoteSmooth'

/** Ghosted second player. Hidden while riding tandem together. */
export function RemotePlayer() {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const display = useRef({
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  })
  const connected = useGameStore((s) => s.peerConnected)
  const localTandem = useGameStore((s) => s.flight.tandemRole)
  const remoteRole = useGameStore((s) => s.remoteFlight?.tandemRole ?? 'none')
  const remotePhase = useGameStore((s) => s.remoteFlight?.phase ?? null)
  const remoteChute = useGameStore((s) => s.remoteFlight?.chuteInflation ?? 0)
  const remoteSwing = useGameStore((s) => s.remoteFlight?.chuteSwing ?? 0)
  const remoteAction = useGameStore((s) => s.remoteFlight?.landAction ?? 'none')
  const remoteSpeed = useGameStore((s) => s.remoteFlight?.airspeed ?? 0)
  const remoteAlt = useGameStore((s) => s.remoteFlight?.altitude ?? 0)
  const remoteVy = useGameStore((s) => s.remoteFlight?.velocity.y ?? 0)

  useFrame((_, dt) => {
    if (!group.current || !body.current) return
    const remote = predictedRemote() ?? useGameStore.getState().remoteFlight
    if (!remote) return

    const k = 1 - Math.pow(0.00005, dt)
    const d = display.current
    d.x += (remote.position.x - d.x) * k
    d.y += (remote.position.y - d.y) * k
    d.z += (remote.position.z - d.z) * k
    let dyaw = remote.yaw - d.yaw
    while (dyaw > Math.PI) dyaw -= Math.PI * 2
    while (dyaw < -Math.PI) dyaw += Math.PI * 2
    d.yaw += dyaw * k
    d.pitch += (remote.pitch - d.pitch) * k
    d.roll += (remote.roll - d.roll) * k

    group.current.position.set(d.x, d.y, d.z)
    group.current.rotation.y = d.yaw
    const onGround =
      remote.phase === 'grounded' ||
      remote.phase === 'running' ||
      remote.phase === 'landed' ||
      remote.phase === 'walking'
    body.current.rotation.set(
      onGround ? 0 : -d.pitch * 0.8,
      0,
      onGround ? 0 : -d.roll,
    )
  })

  if (!connected || !remotePhase) return null
  if (localTandem !== 'none' || remoteRole !== 'none') return null

  const phase = remotePhase
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
            <GliderModel hidePilot staticModel />
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
              motionSpeed={remoteSpeed}
              landAction={remoteAction}
              chuteSwing={remoteSwing}
              altitude={remoteAlt}
              airborneY={remoteVy}
            />
          </group>
        )}
        {showChute && <ParachuteCanopy inflation={remoteChute} swing={remoteSwing} />}
      </group>
    </group>
  )
}
