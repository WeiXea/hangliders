import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { useGameStore } from '../game/gameStore'

export function ChallengeRings() {
  const rings = useGameStore((s) => s.rings)
  const mode = useGameStore((s) => s.mode)
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]

  if (mode !== 'challenge') return null

  return (
    <>
      {rings.map((ring, i) => {
        const prev = i === 0 ? config.launchPosition : rings[i - 1].position
        const yaw = Math.atan2(ring.position.x - prev.x, ring.position.z - prev.z)
        return <RingGate key={ring.id} ring={ring} faceYaw={yaw} />
      })}
    </>
  )
}

function RingGate({
  ring,
  faceYaw,
}: {
  ring: { id: number; position: { x: number; y: number; z: number }; radius: number; passed: boolean }
  faceYaw: number
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current || ring.passed) return
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.35 + Math.sin(clock.getElapsedTime() * 3) * 0.2
  })

  const color = ring.passed ? '#52b788' : '#ffd166'

  return (
    <group position={[ring.position.x, ring.position.y, ring.position.z]} rotation={[0, faceYaw, 0]}>
      {/* Vertical torus — hole faces along the flight path */}
      <mesh ref={ref} castShadow>
        <torusGeometry args={[ring.radius, 0.38, 12, 40]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={ring.passed ? 0.12 : 0.45}
          transparent
          opacity={ring.passed ? 0.45 : 0.92}
          metalness={0.3}
          roughness={0.35}
        />
      </mesh>
      {!ring.passed && (
        <mesh>
          <ringGeometry args={[ring.radius - 0.6, ring.radius + 0.6, 40]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * ring.radius, -ring.radius * 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, ring.radius * 0.9, 8]} />
          <meshStandardMaterial color="#495057" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export function LandingZone() {
  const mode = useGameStore((s) => s.mode)
  const biome = useGameStore((s) => s.biome)

  if (mode !== 'challenge') return null

  const config = BIOME_CONFIGS[biome]
  const lz = config.landingZone
  const y = config.getHeight(lz.center.x, lz.center.z) + 0.12

  return (
    <group position={[lz.center.x, y, lz.center.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[lz.radius, 48]} />
        <meshStandardMaterial color="#52b788" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[lz.radius - 1.2, lz.radius, 48]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}
