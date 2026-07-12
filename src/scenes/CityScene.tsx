import { useMemo, type ReactElement } from 'react'
import type { BiomeConfig } from '../types/game'
import { DetailedTerrain, HorizonRing, LaunchRamp } from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'

interface CitySceneProps {
  config: BiomeConfig
}

type BuildingDef = [number, number, number, number, string, boolean[]]

function Building({
  position,
  width,
  depth,
  height,
  color,
  windows,
}: {
  position: [number, number, number]
  width: number
  depth: number
  height: number
  color: string
  windows: boolean[]
}) {
  const rows = Math.floor(height / 3)
  const cols = Math.floor(width / 2)

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.2} />
      </mesh>
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const idx = row * cols + col
          const lit = windows[idx % windows.length]
          return (
            <mesh
              key={`${row}-${col}`}
              position={[(col - cols / 2 + 0.5) * 2, row * 3 + 1.5, depth / 2 + 0.06]}
            >
              <planeGeometry args={[1.3, 2.2]} />
              <meshStandardMaterial
                color={lit ? '#ffe066' : '#2d3748'}
                emissive={lit ? '#ffe066' : '#000000'}
                emissiveIntensity={lit ? 0.45 : 0}
              />
            </mesh>
          )
        }),
      )}
    </group>
  )
}

function StreetGrid() {
  const lines = useMemo(() => {
    const result: ReactElement[] = []
    for (let i = -80; i <= 120; i += 20) {
      result.push(
        <mesh key={`h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[30, 0.08, i]}>
          <planeGeometry args={[260, 2]} />
          <meshStandardMaterial color="#343a40" roughness={0.88} />
        </mesh>,
      )
      result.push(
        <mesh key={`v${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[i, 0.08, 40]}>
          <planeGeometry args={[260, 2]} />
          <meshStandardMaterial color="#343a40" roughness={0.88} />
        </mesh>,
      )
    }
    return result
  }, [])
  return <>{lines}</>
}

const BUILDINGS: BuildingDef[] = [
  [10, 9, 25, 14, '#718096', [true, false, true, true]],
  [30, 11, 35, 22, '#4a5568', [false, true, true, false]],
  [50, 8, 20, 32, '#2d3748', [true, true, false, true]],
  [70, 10, 30, 18, '#718096', [true, false, false, true]],
  [-10, 7, 40, 12, '#a0aec0', [false, true, true, true]],
  [15, 9, 55, 26, '#4a5568', [true, true, true, false]],
  [45, 7, 65, 16, '#718096', [false, false, true, true]],
  [65, 11, 80, 24, '#2d3748', [true, true, true, true]],
  [85, 8, 45, 20, '#a0aec0', [true, false, true, false]],
  [100, 12, 60, 28, '#4a5568', [false, true, false, true]],
  [5, 6, 75, 10, '#cbd5e0', [true, true, false, false]],
  [55, 9, 95, 15, '#718096', [true, false, true, true]],
]

function SkylineSilhouette() {
  return (
    <group position={[140, 0, 120]}>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[i * 8, 8 + (i % 4) * 6, 0]} castShadow>
          <boxGeometry args={[6, 16 + (i % 5) * 8, 6]} />
          <meshStandardMaterial color="#495057" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export function CityScene({ config }: CitySceneProps) {
  return (
    <>
      <SharedSky config={config} />
      <SharedLighting />
      <DetailedTerrain config={config} biome="city" size={320} segments={100} />
      <HorizonRing color="#6c757d" y={0} />
      <StreetGrid />
      {BUILDINGS.map(([x, w, z, h, color, windows], i) => (
        <Building
          key={i}
          position={[x, config.getHeight(x, z), z]}
          width={w}
          depth={w * 0.85}
          height={h}
          color={color}
          windows={windows}
        />
      ))}
      <SkylineSilhouette />
      <LaunchRamp config={config} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.15, -28]}>
        <planeGeometry args={[280, 28, 1, 1]} />
        <meshStandardMaterial
          color="#0077b6"
          roughness={0.15}
          metalness={0.55}
          transparent
          opacity={0.88}
        />
      </mesh>
    </>
  )
}
