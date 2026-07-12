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

function PalmTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.16, 0.28, 5, 8]} />
        <meshStandardMaterial color="#6b4423" roughness={0.88} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh
          key={i}
          castShadow
          position={[Math.sin(i * 0.95) * 1.5, 5.1, Math.cos(i * 0.95) * 1.5]}
          rotation={[0.55, i * 0.95, 0.12]}
        >
          <boxGeometry args={[0.32, 2.9, 0.08]} />
          <meshStandardMaterial color="#2d6a4f" roughness={0.72} />
        </mesh>
      ))}
    </group>
  )
}

function DistantIsland({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 5, 0]}>
        <coneGeometry args={[12, 16, 8]} />
        <meshStandardMaterial color="#40916c" roughness={0.82} />
      </mesh>
      <mesh position={[4, 3, 2]} castShadow>
        <coneGeometry args={[6, 10, 7]} />
        <meshStandardMaterial color="#52796f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[14, 15, 1, 14]} />
        <meshStandardMaterial color="#f4d58d" roughness={0.9} />
      </mesh>
    </group>
  )
}

function BeachHut({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[3.2, 2.2, 2.8]} />
        <meshStandardMaterial color="#d4a373" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 2.8, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.6, 1.6, 4]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
    </group>
  )
}

export function BeachScene({ config }: BeachSceneProps) {
  const palms = useMemo(
    () =>
      Array.from({ length: 55 }, (_, i) => {
        const x = -90 + i * 5.5 + Math.sin(i * 1.7) * 8
        const z = -40 + Math.cos(i * 1.1) * 28 + (i % 4) * 12
        return {
          pos: [x, config.getHeight(x, z), z] as [number, number, number],
          scale: 0.75 + (Math.sin(i * 9) * 0.5 + 0.5) * 0.55,
        }
      }),
    [config],
  )

  return (
    <>
      <SharedSky config={config} />
      <SharedLighting />
      <DetailedTerrain config={config} biome="beach" />
      <HorizonRing color="#c9a227" y={-1} />
      <OceanSurface y={-0.12} />
      <LaunchRamp config={config} />
      <CliffFace position={[-70, 10, -10]} size={[12, 24, 55]} rotation={0.18} />
      <CliffFace position={[-62, 7, 35]} size={[9, 16, 35]} rotation={-0.12} />
      <CliffFace position={[-55, 12, -40]} size={[14, 28, 40]} rotation={0.32} />
      <CliffFace position={[-85, 8, 20]} size={[10, 18, 45]} rotation={0.05} />
      <ScatterRocks config={config} count={70} area={280} />
      {palms.map((p, i) => (
        <PalmTree key={i} position={p.pos} scale={p.scale} />
      ))}
      <BeachHut position={[20, config.getHeight(20, 55), 55]} />
      <BeachHut position={[-10, config.getHeight(-10, 70), 70]} />
      <DistantIsland position={[220, -0.5, 280]} scale={1.6} />
      <DistantIsland position={[160, -0.3, 320]} scale={1.1} />
      <DistantIsland position={[300, -0.4, 240]} scale={1.3} />
      <DistantIsland position={[260, -0.2, 360]} scale={0.9} />
      <DistantIsland position={[340, -0.3, 300]} scale={1.8} />
    </>
  )
}
