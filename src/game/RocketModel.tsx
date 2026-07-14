import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createLoftBody, getSpaceXLogoTexture, usePaintSkinMaps } from './vehicleSurfaces'
import { RocketPlume } from '../scenes/CityLaunchPad'

const WHITE = '#e8ecef'
const BLACK = '#1a1d21'

/** Falcon 9–class two-stage stack + Crew Dragon capsule (procedural). */
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
  const normalScale = useMemo(() => new THREE.Vector2(0.5, 0.5), [])
  const nozzle = useRef<THREE.MeshStandardMaterial>(null)

  const s1 = useMemo(
    () =>
      createLoftBody(
        [
          { z: 2.2, rx: 1.85, ry: 1.85 },
          { z: 1.5, rx: 1.95, ry: 1.95 },
          { z: 0.5, rx: 1.98, ry: 1.98 },
          { z: -0.5, rx: 1.98, ry: 1.98 },
          { z: -1.5, rx: 1.95, ry: 1.95 },
          { z: -2.3, rx: 1.85, ry: 1.85 },
        ],
        20,
      ),
    [],
  )

  const s2 = useMemo(
    () =>
      createLoftBody(
        [
          { z: 1.2, rx: 1.45, ry: 1.45 },
          { z: 0.4, rx: 1.52, ry: 1.52 },
          { z: -0.6, rx: 1.52, ry: 1.52 },
          { z: -1.4, rx: 1.42, ry: 1.42 },
        ],
        18,
      ),
    [],
  )

  const paint = {
    color: WHITE,
    normalMap: skin.normalMap,
    normalScale,
    roughnessMap: skin.roughnessMap,
    roughness: 0.38,
    metalness: 0.25,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  } as const

  useFrame((state) => {
    if (nozzle.current && thrust > 0.05) {
      nozzle.current.emissiveIntensity = 0.6 + thrust * 1.4 + Math.sin(state.clock.elapsedTime * 30) * 0.2
    }
  })

  return (
    <group scale={1.15}>
      {!stage1Separated && (
        <group position={[0, 0, 0]}>
          <mesh geometry={s1} castShadow receiveShadow position={[0, 0, -1]}>
            <meshPhysicalMaterial {...paint} />
          </mesh>
          {/* Black interstage chevron */}
          <mesh position={[0, 0, 1.8]}>
            <cylinderGeometry args={[1.7, 1.95, 1.2, 16]} />
            <meshPhysicalMaterial color={BLACK} roughness={0.45} metalness={0.35} />
          </mesh>
          {/* Grid fins */}
          {([-1, 1] as const).map((s) => (
            <mesh key={`gf${s}`} castShadow position={[s * 2.05, 0, -1.8]} rotation={[0, 0, s * 0.35]}>
              <boxGeometry args={[0.08, 1.4, 0.9]} />
              <meshPhysicalMaterial color={BLACK} metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
          {/* Landing legs stowed */}
          {([-1, 1] as const).flatMap((s) =>
            [0.8, -0.8].map((z) => (
              <mesh key={`lg${s}${z}`} position={[s * 1.85, -1.6, z]} rotation={[0.4, 0, s * 0.5]}>
                <boxGeometry args={[0.12, 1.8, 0.12]} />
                <meshPhysicalMaterial color={WHITE} metalness={0.4} roughness={0.45} />
              </mesh>
            )),
          )}
          {/* Logo on booster */}
          <mesh position={[0, 0.2, 2.05]} rotation={[0, 0, 0]}>
            <planeGeometry args={[2.2, 0.6]} />
            <meshStandardMaterial map={logo} transparent roughness={0.4} />
          </mesh>
          {/* Engine section */}
          <mesh position={[0, -2.1, -0.2]}>
            <cylinderGeometry args={[1.5, 1.7, 1.4, 18]} />
            <meshPhysicalMaterial color={BLACK} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, -2.8, -0.2]}>
            <cylinderGeometry args={[0.9, 1.2, 0.5, 16]} />
            <meshStandardMaterial ref={nozzle} color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.3} />
          </mesh>
          {!staticModel && <RocketPlume power={thrust} />}
        </group>
      )}

      {/* Stage 2 + capsule */}
      <group position={[0, stage1Separated ? 0 : 4.2, 0]}>
        <mesh geometry={s2} castShadow position={[0, 0, 0]}>
          <meshPhysicalMaterial {...paint} />
        </mesh>
        {/* Trunk */}
        <mesh castShadow position={[0, 0.5, 1.5]}>
          <cylinderGeometry args={[1.15, 1.25, 1.8, 16]} />
          <meshPhysicalMaterial color={WHITE} roughness={0.42} metalness={0.22} clearcoat={0.4} />
        </mesh>
        {/* Crew Dragon capsule */}
        <mesh castShadow position={[0, 1.8, 2.2]}>
          <capsuleGeometry args={[1.05, 2.2, 8, 20]} />
          <meshPhysicalMaterial color={WHITE} roughness={0.35} metalness={0.28} clearcoat={0.6} />
        </mesh>
        <mesh position={[0, 2.4, 2.85]}>
          <sphereGeometry args={[0.75, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
          <meshPhysicalMaterial
            color="#1a1d21"
            roughness={0.15}
            metalness={0.4}
            clearcoat={0.8}
          />
        </mesh>
        {/* Nose cone */}
        <mesh position={[0, 2.2, 3.6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.85, 1.4, 16]} />
          <meshPhysicalMaterial color={WHITE} roughness={0.32} metalness={0.25} clearcoat={0.5} />
        </mesh>
        {stage1Separated && !staticModel && <RocketPlume power={thrust * 0.7} />}
      </group>
    </group>
  )
}
