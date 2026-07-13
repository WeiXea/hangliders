import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { GliderModel } from './GliderModel'
import { HelicopterModel } from './HelicopterModel'
import { JetModel } from './JetModel'
import { AnimatedPilot, ParachuteCanopy, PILOT_EYE, PILOT_HIP } from './Pilot'
import { getLookOffsets, setKeyLookTarget, tickLook } from './lookCamera'
import { GliderContactShadow } from '../scenes/SharedSky'
import { VehicleMesh } from '../scenes/CityLife'
import { getTrafficSnapshots } from './trafficRegistry'

export function HangGlider() {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const barRef = useRef<THREE.Group>(null)
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
  const smoothPitch = useRef(0)
  const smoothRoll = useRef(0)
  const smoothYaw = useRef(0)
  const smoothPos = useRef(new THREE.Vector3())
  const smoothCamPos = useRef(new THREE.Vector3())
  const smoothLook = useRef(new THREE.Vector3())
  const camInit = useRef(false)
  const posInit = useRef(false)

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return
    const { flight, input } = useGameStore.getState()
    const { position, pitch, roll, yaw, phase: ph, chuteSwing: swing } = flight

    const attDamp = 1 - Math.exp(-7.5 * delta)
    const posDamp = 1 - Math.exp(-12 * delta)
    const yawDamp = 1 - Math.exp(-7 * delta)
    smoothPitch.current = THREE.MathUtils.lerp(smoothPitch.current, pitch, attDamp)
    smoothRoll.current = THREE.MathUtils.lerp(smoothRoll.current, roll, attDamp)
    let dy = yaw - smoothYaw.current
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    smoothYaw.current += dy * yawDamp
    const sp = smoothPitch.current
    const sr = smoothRoll.current
    const sy = smoothYaw.current

    if (!posInit.current) {
      smoothPos.current.set(position.x, position.y, position.z)
      smoothYaw.current = yaw
      posInit.current = true
    } else if (smoothPos.current.distanceToSquared(position) > 400) {
      smoothPos.current.set(position.x, position.y, position.z)
      smoothYaw.current = yaw
      smoothPitch.current = pitch
      smoothRoll.current = roll
      camInit.current = false
    } else {
      smoothPos.current.lerp(position, posDamp)
    }

    groupRef.current.position.copy(smoothPos.current)
    groupRef.current.rotation.set(0, sy, 0)

    const onGround =
      ph === 'grounded' || ph === 'running' || ph === 'landed' || ph === 'walking'
    const crashed = ph === 'crashed'
    const airbornePilot = ph === 'freefall' || ph === 'parachuting'
    const heli = ph === 'helicopter'
    const jet = ph === 'jet'
    const driving = ph === 'driving'
    const swingRoll = ph === 'parachuting' ? -swing * 0.35 : 0
    const visualPitch = -sp
    bodyRef.current.rotation.set(
      crashed
        ? visualPitch - 0.35
        : heli || jet || driving
          ? visualPitch
          : onGround
            ? 0
            : airbornePilot
              ? Math.max(-0.4, visualPitch)
              : visualPitch,
      crashed ? 0.25 : 0,
      crashed ? -sr : heli || jet || driving ? -sr : onGround ? 0 : -sr + swingRoll,
    )

    if (barRef.current) {
      const barPitch = input.pitchUp ? -0.28 : input.pitchDown ? 0.28 : 0
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
      new THREE.Euler(
        onGround && !heli && !jet && !driving ? 0 : visualPitch * 0.28,
        sy,
        onGround && !heli && !jet && !driving ? 0 : -sr * 0.35 + swingRoll,
        'YXZ',
      ),
    )
    worldQuat.current.multiply(lookQuat)

    const origin = smoothPos.current.clone()
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
      if (flight.altitude < 28) {
        eye.set(0, 4.2, -14)
        lookAt.set(0, -6, 8)
        targetFov = 68
      } else {
        eye.set(0, 2.8, -12)
        lookAt.set(0, -1.5, 10)
        targetFov = 64
      }
    } else if (ph === 'helicopter') {
      if (cameraMode === 'fpv') {
        eye.set(0, 0.55, 0.4)
        lookAt.set(0, 0.2, 18)
        targetFov = 70
      } else if (cameraMode === 'side') {
        eye.set(16, 5, -2)
        lookAt.set(0, 0, 8)
        targetFov = 58
      } else {
        eye.set(0, 6.5, -18)
        lookAt.set(0, -1, 12)
        targetFov = 60
      }
    } else if (ph === 'jet') {
      if (cameraMode === 'fpv') {
        eye.set(0, 0.85, 1.6)
        lookAt.set(0, 0.2, 40)
        targetFov = 72
      } else if (cameraMode === 'side') {
        eye.set(22, 6, -4)
        lookAt.set(0, 0, 10)
        targetFov = 55
      } else {
        eye.set(0, 8, -28)
        lookAt.set(0, -1, 18)
        targetFov = 58
      }
    } else if (ph === 'driving') {
      if (cameraMode === 'fpv') {
        eye.set(0, 1.2, 0.6)
        lookAt.set(0, 0.4, 16)
        targetFov = 68
      } else if (cameraMode === 'side') {
        eye.set(12, 3, -2)
        lookAt.set(0, 0.5, 8)
        targetFov = 58
      } else {
        eye.set(0, 4.5, -12)
        lookAt.set(0, 0.2, 14)
        targetFov = 58
      }
    } else if (cameraMode === 'chase') {
      if (ph === 'flying' && flight.altitude < 22) {
        eye.set(0, 5.2, -14)
        lookAt.set(0, -8, 18)
        targetFov = 66
      } else {
        eye.set(0, 3.5, -16)
        lookAt.set(0, -4, 28)
        targetFov = 62
      }
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
    const lookPos = origin.clone().add(lookAt)

    const camLerp =
      flight.tandemRole === 'passenger'
        ? 1 - Math.exp(-2.2 * delta)
        : ph === 'flying' ||
            ph === 'running' ||
            ph === 'helicopter' ||
            ph === 'jet' ||
            ph === 'driving'
          ? 1 - Math.exp(-4.2 * delta)
          : 1 - Math.exp(-8 * delta)

    if (!camInit.current) {
      smoothCamPos.current.copy(camPos)
      smoothLook.current.copy(lookPos)
      camInit.current = true
    } else {
      smoothCamPos.current.lerp(camPos, camLerp)
      smoothLook.current.lerp(lookPos, camLerp)
    }

    camera.position.copy(smoothCamPos.current)
    camera.lookAt(smoothLook.current)
    lookTarget.current.copy(smoothLook.current)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, camLerp)
      camera.updateProjectionMatrix()
    }
  })

  const onFootGround = phase === 'grounded' || phase === 'running'
  const showWing =
    phase === 'grounded' ||
    phase === 'running' ||
    phase === 'flying' ||
    phase === 'landed' ||
    tandemRole === 'passenger'
  const showHeli = phase === 'helicopter'
  const showJet = phase === 'jet'
  const showDrive = phase === 'driving'
  const offGlider = phase === 'walking' || phase === 'freefall' || phase === 'parachuting'
  const showChute = phase === 'parachuting' || (phase === 'freefall' && chuteDeployed)
  const showTandemPassenger = peerConnected && tandemRole === 'pilot' && showWing
  const vehicleKind = useGameStore((s) => s.flight.vehicleKind)
  const vehicleId = useGameStore((s) => s.flight.vehicleId)
  const jetBurn = useGameStore((s) =>
    s.flight.phase === 'jet' ? Math.min(1, s.flight.airspeed / 95) : 0,
  )
  const driveColor =
    vehicleId >= 0
      ? getTrafficSnapshots().find((v) => v.id === vehicleId)?.color
      : undefined

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        {showDrive && vehicleKind && (
          <group>
            <VehicleMesh kind={vehicleKind} color={driveColor} />
          </group>
        )}
        {showJet && (
          <group>
            <JetModel afterburner={Math.max(0.15, jetBurn)} />
          </group>
        )}
        {showHeli && (
          <group>
            <HelicopterModel rpm={1.15} />
            <group position={[0, 0.15, 0.2]}>
              <AnimatedPilot mode="stand" />
            </group>
          </group>
        )}
        {showWing && (
          <group>
            <GliderModel
              barRef={barRef}
              hidePilot={
                onFootGround || tandemRole === 'passenger' || phase === 'landed'
              }
            />
            {onFootGround && tandemRole !== 'passenger' && (
              <group position={[0, -0.58, 0.35]}>
                <AnimatedPilot mode="stand" />
              </group>
            )}
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
        {(phase === 'walking' || phase === 'grounded' || phase === 'running') && (
          <GliderContactShadow />
        )}
      </group>
    </group>
  )
}
