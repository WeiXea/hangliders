import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { GliderModel } from './GliderModel'

export function HangGlider() {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const barRef = useRef<THREE.Group>(null)
  const flight = useGameStore((s) => s.flight)
  const input = useGameStore((s) => s.input)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const { camera } = useThree()

  const lookTarget = useRef(new THREE.Vector3())
  const worldQuat = useRef(new THREE.Quaternion())

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return
    const { position, pitch, roll, yaw, phase } = flight

    groupRef.current.position.set(position.x, position.y, position.z)
    groupRef.current.rotation.set(0, yaw, 0)

    // Keep wings level on the ground so the pilot stands upright
    const onGround = phase === 'grounded' || phase === 'running' || phase === 'landed'
    bodyRef.current.rotation.set(onGround ? 0 : pitch, 0, onGround ? 0 : -roll)

    if (barRef.current) {
      const barPitch = input.pitchUp ? 0.28 : input.pitchDown ? -0.28 : 0
      barRef.current.rotation.x = THREE.MathUtils.lerp(
        barRef.current.rotation.x,
        barPitch,
        1 - Math.pow(0.001, delta),
      )
    }

    if (phase !== 'flying' && phase !== 'running' && phase !== 'grounded') return

    worldQuat.current.setFromEuler(new THREE.Euler(pitch, yaw, -roll, 'YXZ'))

    const origin = new THREE.Vector3(position.x, position.y, position.z)
    let eye = new THREE.Vector3()
    let look = new THREE.Vector3()
    let targetFov = 60

    if (cameraMode === 'chase') {
      // Behind and slightly above — look downward so horizon + ground stay in frame
      eye.set(0, 3.5, -16)
      look.set(0, -4, 28)
      targetFov = 62
    } else if (cameraMode === 'side') {
      eye.set(18, 4, -4)
      look.set(0, -2, 12)
      targetFov = 58
    } else {
      eye.set(0, -0.38, -0.35)
      look.set(0, -2.5, 26)
      targetFov = 76
    }

    eye.applyQuaternion(worldQuat.current)
    look.applyQuaternion(worldQuat.current)

    const camPos = origin.clone().add(eye)
    lookTarget.current.copy(origin).add(look)

    const lerp = 1 - Math.pow(0.00005, delta)
    camera.position.lerp(camPos, lerp)
    camera.lookAt(lookTarget.current)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, lerp)
      camera.updateProjectionMatrix()
    }
  })

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <GliderModel barRef={barRef} />
      </group>
    </group>
  )
}
