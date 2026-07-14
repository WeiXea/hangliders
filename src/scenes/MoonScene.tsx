import { useMemo } from 'react'
import * as THREE from 'three'
import { DetailedTerrain } from './TerrainHelpers'
import { SharedLighting } from './SharedSky'
import type { BiomeConfig } from '../types/game'

/** Lunar landing site — crater terrain, black sky, Earth in the distance. */
export function MoonScene({ config }: { config: BiomeConfig }) {
  const stars = useMemo(() => {
    const count = 1200
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 800 + Math.random() * 400
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.cos(phi)
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

  return (
    <>
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 400, 2200]} />
      <ambientLight intensity={0.08} />
      <directionalLight
        castShadow
        position={[120, 180, 80]}
        intensity={2.4}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={400}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <DetailedTerrain config={config} biome="moon" size={480} segments={64} />
      <mesh geometry={stars}>
        <pointsMaterial size={1.2} color="#ffffff" transparent opacity={0.85} sizeAttenuation={false} />
      </mesh>
      {/* Earth in the black sky */}
      <mesh position={[-280, 220, -420]}>
        <sphereGeometry args={[55, 32, 24]} />
        <meshStandardMaterial color="#4cc9f0" emissive="#1d3557" emissiveIntensity={0.35} roughness={0.6} />
      </mesh>
      <mesh position={[-280, 220, -420]}>
        <sphereGeometry args={[56, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#2a6f97" roughness={0.7} side={THREE.FrontSide} />
      </mesh>
      {/* Landing marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[8, 9, 48]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <SharedLighting config={config} />
    </>
  )
}
