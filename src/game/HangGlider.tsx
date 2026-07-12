import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { GliderModel } from './GliderModel'
import { AnimatedPilot, ParachuteCanopy, PILOT_EYE, PILOT_HIP } from './Pilot'
import { getLookOffsets, setKeyLookTarget, tickLook } from './lookCamera'

export function HangGlider() {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const barRef = useRef<THREE.Group>(null)
  // Structural only — pose/position read live in useFrame to avoid stuttery remounts
  const phase = useGameStore((s) => s.flight.phase)
  const tandemRole = useGameStore((s) => s.flight.tandemRole)
  const chuteDeployed = useGameStore((s) => s.flight.chuteDeployed)
  const chuteInflation = useGameStore((s) => s.flight.chuteInflation)
  const chuteSwing = useGameStore((s) => s.flight.chuteSwing)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const peerConnected = useGameStore((s) => s.peerConnected)
  const { camera } = useThree()

  const lookTarget = useRef(new THREE.Vector3())
  const worldQuat = useRef(new THREE.Quaternion())

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return
    const { flight, input } = useGameStore.getState()
    const { position, pitch, roll, yaw, phase: ph, chuteSwing: swing } = flight

    groupRef.current.position.set(position.x, position.y, position.z)
    groupRef.current.rotation.set(0, yaw, 0)

    const onGround =
      ph === 'grounded' || ph === 'running' || ph === 'landed' || ph === 'walking'
    const airbornePilot = ph === 'freefall' || ph === 'parachuting'
    const swingRoll = ph === 'parachuting' ? -swing * 0.45 : 0
    bodyRef.current.rotation.set(
      onGround ? 0 : airbornePilot ? Math.min(0.45, pitch) : pitch,
      0,
      onGround ? 0 : -roll + swingRoll,
    )

    if (barRef.current) {
      const barPitch = input.pitchUp ? 0.28 : input.pitchDown ? -0.28 : 0
      barRef.current.rotation.x = THREE.MathUtils.lerp(
        barRef.current.rotation.x,
        barPitch,
        1 - Math.pow(0.001, delta),
      )
    }

    if (input.lookBack) setKeyLookTarget(Math.PI)
    else if (input.lookLeft) setKeyLookTarget(Math.PI * 0.55)
    else if (input.lookRight) setKeyLookTarget(-Math.PI * 0.55)
    else if (!getLookOffsets().mouseHeld) setKeyLookTarget(null)

    tickLook(delta)
    const look = getLookOffsets()

    const lookQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(look.pitch, look.yaw, 0, 'YXZ'),
    )

    worldQuat.current.setFromEuler(
      new THREE.Euler(onGround ? 0 : pitch * 0.35, yaw, onGround ? 0 : -roll * 0.5 + swingRoll, 'YXZ'),
    )
    worldQuat.current.multiply(lookQuat)

    const origin = new THREE.Vector3(position.x, position.y, position.z)
    let eye = new THREE.Vector3()
    let lookAt = new THREE.Vector3()
    let targetFov = 60

    if (ph === 'walking') {
      eye.set(0, PILOT_EYE + 0.15, -6.5)
      lookAt.set(0, PILOT_EYE * 0.55, 10)
      targetFov = 58
    } else if (ph === 'freefall') {
      eye.set(0, 1.6, -10)
      lookAt.set(0, -3, 14)
      targetFov = 72
    } else if (ph === 'parachuting') {
      eye.set(0, 2.8, -12)
      lookAt.set(0, -1.5, 10)
      targetFov = 64
    } else if (cameraMode === 'chase') {
      eye.set(0, 3.5, -16)
      lookAt.set(0, -4, 28)
      targetFov = 62
    } else if (cameraMode === 'side') {
      eye.set(18, 4, -4)
      lookAt.set(0, -2, 12)
      targetFov = 58
    } else {
      eye.set(0, -0.38, -0.35)
      lookAt.set(0, -2.5, 26)
      targetFov = 76
    }

    eye.applyQuaternion(worldQuat.current)
    lookAt.applyQuaternion(worldQuat.current)

    const camPos = origin.clone().add(eye)
    lookTarget.current.copy(origin).add(lookAt)

    // Passenger: snappier camera so net-smoothed craft doesn't feel laggy
    const camLerp =
      flight.tandemRole === 'passenger'
        ? 1 - Math.pow(0.0000001, delta)
        : ph === 'flying' || ph === 'running'
          ? 1 - Math.pow(0.00002, delta)
          : 1 - Math.pow(0.00005, delta)
    camera.position.lerp(camPos, camLerp)
    camera.lookAt(lookTarget.current)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, camLerp)
      camera.updateProjectionMatrix()
    }
  })

  const showWing =
    phase === 'grounded' ||
    phase === 'running' ||
    phase === 'flying' ||
    phase === 'landed' ||
    tandemRole === 'passenger'
  const offGlider = phase === 'walking' || phase === 'freefall' || phase === 'parachuting'
  const showChute = phase === 'parachuting' || (phase === 'freefall' && chuteDeployed)
  const showTandemPassenger = peerConnected && tandemRole === 'pilot' && showWing

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        {showWing && (
          <group>
            <GliderModel barRef={barRef} hidePilot={tandemRole === 'passenger'} />
            {tandemRole === 'passenger' && (
              <>
                <group position={[-0.35, -1.45, 0.1]}>
                  <AnimatedPilot mode="prone" suitColor="#3d5a80" />
                </group>
                <group position={[0.35, -1.45, 0.15]}>
                  <AnimatedPilot mode="prone" />
                </group>
              </>
            )}
            {showTandemPassenger && (
              <group position={[0.45, -1.45, 0.15]}>
                <AnimatedPilot mode="prone" suitColor="#3d5a80" />
              </group>
            )}
          </group>
        )}
        {offGlider && tandemRole !== 'passenger' && (
          <group position={[0, phase === 'walking' ? 0 : -PILOT_HIP * 0.15, 0]}>
            <AnimatedPilot />
          </group>
        )}
        {showChute && (
          <ParachuteCanopy inflation={chuteInflation} swing={chuteSwing} />
        )}
      </group>
    </group>
  )
}
