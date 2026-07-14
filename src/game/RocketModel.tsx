import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getSpaceXLogoTexture, usePaintSkinMaps } from './vehicleSurfaces'
import { RocketPlume } from '../scenes/CityLaunchPad'

const WHITE = '#eceff1'
const BLACK = '#14171a'

/** Falcon 9–class stack — Y-up, booster + interstage + upper stage + Dragon capsule. */
export function RocketModel({
  staticModel = false,
  stage1Separated = false,
  thrust = 0,
}: {
  staticModel?: boolean
  stage1Separated?: boolean
  thrust?: number
}) {
  const logo = useMemo(() => getSpaceXLogoTexture(), [])
  const skin = usePaintSkinMaps(2)
  const normalScale = useMemo(() => new THREE.Vector2(0.55, 0.55), [])
  const nozzle = useRef<THREE.MeshStandardMaterial>(null)

  const paint = {
    color: WHITE,
    normalMap: skin.normalMap,
    normalScale,
    roughnessMap: skin.roughnessMap,
    roughness: 0.34,
    metalness: 0.28,
    clearcoat: 0.62,
    clearcoatRoughness: 0.18,
  } as const

  const S1_H = 22
  const INTER_H = 1.6
  const S2_H = 7.5
  const s2Base = stage1Separated ? 0 : S1_H + INTER_H

  useFrame((state) => {
    if (nozzle.current && thrust > 0.05) {
      nozzle.current.emissiveIntensity =
        0.55 + thrust * 1.5 + Math.sin(state.clock.elapsedTime * 28) * 0.18
    }
  })

  return (
    <group>
      {!stage1Separated && (
        <group>
          {/* Stage 1 booster */}
          <mesh castShadow receiveShadow position={[0, S1_H * 0.5, 0]}>
            <cylinderGeometry args={[1.85, 1.95, S1_H, 24]} />
            <meshPhysicalMaterial {...paint} />
          </mesh>
          {/* LOX tank band */}
          <mesh position={[0, S1_H * 0.62, 0]}>
            <cylinderGeometry args={[1.86, 1.86, 0.12, 24]} />
            <meshPhysicalMaterial color="#d0d5da" roughness={0.4} metalness={0.35} clearcoat={0.5} />
          </mesh>
          {/* Black interstage */}
          <mesh castShadow position={[0, S1_H + INTER_H * 0.5, 0]}>
            <cylinderGeometry args={[1.72, 1.92, INTER_H, 20]} />
            <meshPhysicalMaterial color={BLACK} roughness={0.42} metalness={0.45} />
          </mesh>
          {/* Grid fins */}
          {([0, 1, 2, 3] as const).map((i) => {
            const a = (i / 4) * Math.PI * 2
            return (
              <mesh
                key={i}
                castShadow
                position={[Math.cos(a) * 2.05, 2.8, Math.sin(a) * 2.05]}
                rotation={[0, -a, Math.cos(a) * 0.38]}
              >
                <boxGeometry args={[0.1, 1.5, 1.05]} />
                <meshPhysicalMaterial color={BLACK} metalness={0.55} roughness={0.38} />
              </mesh>
            )
          })}
          {/* Landing legs (stowed) */}
          {([0, 1, 2, 3] as const).map((i) => {
            const a = (i / 4) * Math.PI * 2 + 0.4
            return (
              <mesh
                key={`leg${i}`}
                position={[Math.cos(a) * 1.9, 1.2, Math.sin(a) * 1.9]}
                rotation={[0.55, -a, 0]}
              >
                <boxGeometry args={[0.14, 2.4, 0.14]} />
                <meshPhysicalMaterial color={WHITE} metalness={0.42} roughness={0.42} />
              </mesh>
            )
          })}
          {/* Engine bay + octaweb */}
          <mesh castShadow position={[0, 1.1, 0]}>
            <cylinderGeometry args={[1.55, 1.85, 2.2, 20]} />
            <meshPhysicalMaterial color={BLACK} metalness={0.65} roughness={0.32} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[1.05, 1.35, 0.7, 18]} />
            <meshStandardMaterial ref={nozzle} color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.25} />
          </mesh>
          {/* SpaceX logo */}
          <mesh position={[0, S1_H * 0.45, 1.96]} rotation={[0, 0, 0]}>
            <planeGeometry args={[2.4, 0.65]} />
            <meshStandardMaterial map={logo} transparent roughness={0.35} depthWrite={false} />
          </mesh>
          {!staticModel && <RocketPlume power={thrust} />}
        </group>
      )}

      {/* Upper stage + Dragon */}
      <group position={[0, s2Base, 0]}>
        <mesh castShadow position={[0, S2_H * 0.5, 0]}>
          <cylinderGeometry args={[1.38, 1.48, S2_H, 22]} />
          <meshPhysicalMaterial {...paint} />
        </mesh>
        {/* Trunk */}
        <mesh castShadow position={[0, S2_H + 1.2, 0]}>
          <cylinderGeometry args={[1.12, 1.22, 2.4, 18]} />
          <meshPhysicalMaterial color={WHITE} roughness={0.38} metalness={0.24} clearcoat={0.45} />
        </mesh>
        {/* Crew Dragon capsule */}
        <mesh castShadow position={[0, S2_H + 4.2, 0]}>
          <capsuleGeometry args={[1.08, 2.6, 10, 24]} />
          <meshPhysicalMaterial color={WHITE} roughness={0.3} metalness={0.3} clearcoat={0.65} />
        </mesh>
        {/* Window band */}
        <mesh position={[0, S2_H + 5.1, 1.02]}>
          <boxGeometry args={[1.5, 0.55, 0.08]} />
          <meshPhysicalMaterial color="#0d1117" roughness={0.12} metalness={0.55} clearcoat={0.85} />
        </mesh>
        {/* Nose / dock ring */}
        <mesh castShadow position={[0, S2_H + 6.8, 0]}>
          <coneGeometry args={[0.95, 2.2, 20]} />
          <meshPhysicalMaterial color={WHITE} roughness={0.28} metalness={0.28} clearcoat={0.55} />
        </mesh>
        {stage1Separated && !staticModel && <RocketPlume power={thrust * 0.75} />}
      </group>
    </group>
  )
}

/** Total stack height for pad placement. */
export const ROCKET_STACK_HEIGHT = 22 + 1.6 + 7.5 + 9
