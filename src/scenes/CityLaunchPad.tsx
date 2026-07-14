import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { CITY_STREET_DECK } from '../game/cityBuildings'
import { ROCKET_PAD, ROCKET_TOWER } from '../game/rocketPad'
import { getSpaceXLogoTexture } from '../game/vehicleSurfaces'

function LogoPanel({ position, rotation, scale = 1 }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number }) {
  const tex = useMemo(() => getSpaceXLogoTexture(), [])
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]} scale={scale}>
      <planeGeometry args={[4, 1.1]} />
      <meshStandardMaterial map={tex} transparent roughness={0.4} metalness={0.2} />
    </mesh>
  )
}

/** Starbase-style pad — flame trench, tower, elevator, floodlights. */
export function CityLaunchPad() {
  const getHeight = BIOME_CONFIGS.city.getHeight
  const deckY = getHeight(ROCKET_PAD.x, ROCKET_PAD.z) + CITY_STREET_DECK

  return (
    <group position={[ROCKET_PAD.x, deckY, ROCKET_PAD.z]}>
      {/* Octagrid pad */}
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[14, 14, 0.12, 8]} />
        <meshStandardMaterial color="#3a4046" roughness={0.85} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <ringGeometry args={[5, 13.5, 8]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Flame trench */}
      <mesh position={[0, -1.2, 0]}>
        <boxGeometry args={[6, 2.4, 10]} />
        <meshStandardMaterial color="#111" roughness={0.95} />
      </mesh>
      {/* Hold-down strongback */}
      <mesh castShadow position={[0, 12, -1.5]}>
        <boxGeometry args={[0.35, 24, 0.35]} />
        <meshStandardMaterial color="#adb5bd" metalness={0.6} roughness={0.35} />
      </mesh>
      <LogoPanel position={[0, 8, 2.2]} scale={1.2} />
    </group>
  )
}

/** Crew access tower with elevator car. */
export function RocketTower({ elevatorY }: { elevatorY?: number }) {
  const getHeight = BIOME_CONFIGS.city.getHeight
  const baseY = getHeight(ROCKET_TOWER.baseX, ROCKET_TOWER.baseZ) + CITY_STREET_DECK
  const carY = elevatorY ?? baseY + 1.2

  return (
    <group position={[ROCKET_TOWER.baseX, baseY, ROCKET_TOWER.baseZ]}>
      {/* Tower structure */}
      <mesh castShadow position={[0, ROCKET_TOWER.topY * 0.5, 0]}>
        <boxGeometry args={[3.5, ROCKET_TOWER.topY, 3.5]} />
        <meshStandardMaterial color="#495057" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* Catwalk to rocket */}
      <mesh castShadow position={[12, ROCKET_TOWER.topY, 0]}>
        <boxGeometry args={[22, 0.35, 2.5]} />
        <meshStandardMaterial color="#6c757d" metalness={0.5} roughness={0.45} />
      </mesh>
      <LogoPanel position={[0, ROCKET_TOWER.topY - 2, 2]} rotation={[0, 0, 0]} />
      {/* Elevator car */}
      <mesh castShadow position={[0, carY - baseY, 0]}>
        <boxGeometry args={[2.4, 2.8, 2.4]} />
        <meshStandardMaterial color="#ced4da" metalness={0.55} roughness={0.35} />
      </mesh>
      <Text position={[0, ROCKET_TOWER.topY + 1.5, 0]} fontSize={0.55} color="#ffd60a" anchorX="center">
        ELEVATOR
      </Text>
      {/* Floodlights */}
      {([-1, 1] as const).map((s) => (
        <spotLight
          key={s}
          position={[s * 8, 4, 6]}
          angle={0.45}
          penumbra={0.4}
          intensity={2}
          color="#fff3bf"
          castShadow
        />
      ))}
    </group>
  )
}

/** Animated plume for launch */
export function RocketPlume({ power = 0 }: { power?: number }) {
  const ref = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff6b35', emissive: '#ff6b35', emissiveIntensity: 1, transparent: true, opacity: 0.7 }), [])
  useFrame((state) => {
    ref.emissiveIntensity = 0.8 + power * 1.2 + Math.sin(state.clock.elapsedTime * 24) * 0.15
  })
  if (power < 0.05) return null
  return (
    <mesh position={[0, -2, 0]} scale={[1 + power * 0.4, 1 + power * 2, 1 + power * 0.4]}>
      <coneGeometry args={[1.2, 6 + power * 8, 12]} />
      <primitive object={ref} attach="material" />
    </mesh>
  )
}
