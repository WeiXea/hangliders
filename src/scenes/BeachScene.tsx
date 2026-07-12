import { useMemo } from 'react'
import type { BiomeConfig } from '../types/game'
import {
  CliffFace,
  DetailedTerrain,
  HorizonRing,
  LaunchRamp,
  OceanSurface,
  ScatterRocks,
} from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'

interface BeachSceneProps {
  config: BiomeConfig
}

function PalmTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.18, 0.28, 4.5, 8]} />
        <meshStandardMaterial color="#6b4423" roughness={0.88} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          castShadow
          position={[Math.sin(i * 1.05) * 1.4, 4.8, Math.cos(i * 1.05) * 1.4]}
          rotation={[0.55, i * 1.05, 0.15]}
        >
          <boxGeometry args={[0.35, 2.8, 0.1]} />
          <meshStandardMaterial color="#2d6a4f" roughness={0.75} />
        </mesh>
      ))}
    </group>
  )
}

function DistantIsland({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 4, 0]}>
        <coneGeometry args={[10, 14, 8]} />
        <meshStandardMaterial color="#40916c" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[11, 12, 1, 12]} />
        <meshStandardMaterial color="#f4d58d" roughness={0.9} />
      </mesh>
    </group>
  )
}

export function BeachScene({ config }: BeachSceneProps) {
  const palms = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const x = -55 + i * 6.5 + Math.sin(i * 1.7) * 5
        const z = -25 + Math.cos(i * 1.1) * 18 + (i % 3) * 8
        return [x, config.getHeight(x, z), z] as [number, number, number]
      }),
    [config],
  )

  return (
    <>
      <SharedSky config={config} />
      <SharedLighting />
      <DetailedTerrain config={config} biome="beach" />
      <HorizonRing color="#c9a227" y={-1} />
      <OceanSurface y={-0.15} />
      <LaunchRamp config={config} />
      <CliffFace position={[-50, 8, -5]} size={[8, 18, 40]} rotation={0.2} />
      <CliffFace position={[-45, 5, 20]} size={[6, 12, 25]} rotation={-0.1} />
      <CliffFace position={[-38, 10, -25]} size={[10, 22, 30]} rotation={0.35} />
      <ScatterRocks config={config} count={40} area={160} />
      {palms.map((p, i) => (
        <PalmTree key={i} position={p} />
      ))}
      <DistantIsland position={[130, -0.5, 160]} scale={1.2} />
      <DistantIsland position={[90, -0.3, 190]} scale={0.85} />
      <DistantIsland position={[170, -0.4, 130]} scale={0.7} />
      <DistantIsland position={[200, -0.2, 200]} scale={1.5} />
    </>
  )
}
