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
    for (let i = -120; i <= 220; i += 22) {
      result.push(
        <mesh key={`h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[50, 0.08, i]}>
          <planeGeometry args={[420, 2.2]} />
          <meshStandardMaterial color="#343a40" roughness={0.88} />
        </mesh>,
      )
      result.push(
        <mesh key={`v${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[i, 0.08, 60]}>
          <planeGeometry args={[420, 2.2]} />
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
  [120, 10, 90, 22, '#4a5568', [true, true, false, true]],
  [140, 8, 50, 18, '#718096', [false, true, true, false]],
  [160, 11, 110, 30, '#2d3748', [true, false, true, true]],
  [180, 9, 70, 16, '#a0aec0', [true, true, true, false]],
  [90, 7, 130, 12, '#cbd5e0', [false, false, true, true]],
  [110, 10, 150, 20, '#4a5568', [true, true, false, false]],
]

function SkylineSilhouette() {
  return (
    <group position={[220, 0, 200]}>
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} position={[i * 9, 10 + (i % 5) * 7, (i % 3) * 8]} castShadow>
          <boxGeometry args={[7, 18 + (i % 6) * 9, 7]} />
          <meshStandardMaterial color="#495057" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function ParkBench({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.8, 0.08, 0.5]} />
        <meshStandardMaterial color="#6b4423" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.75, -0.2]}>
        <boxGeometry args={[1.8, 0.45, 0.08]} />
        <meshStandardMaterial color="#6b4423" roughness={0.85} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} castShadow position={[x, 0.25, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.45]} />
          <meshStandardMaterial color="#343a40" />
        </mesh>
      ))}
    </group>
  )
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 4.4, 8]} />
        <meshStandardMaterial color="#212529" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 4.5, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial
          color="#ffe066"
          emissive="#ffe066"
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}

function Billboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.5, 0]}>
        <boxGeometry args={[0.12, 5, 0.12]} />
        <meshStandardMaterial color="#495057" metalness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 5.2, 0]}>
        <boxGeometry args={[3.2, 1.8, 0.15]} />
        <meshStandardMaterial color="#c1272d" roughness={0.7} />
      </mesh>
    </group>
  )
}

export function CityScene({ config }: CitySceneProps) {
  return (
    <>
      <SharedSky config={config} />
      <SharedLighting />
      <DetailedTerrain config={config} biome="city" size={640} segments={140} />
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
      <ParkBench position={[22, config.getHeight(22, 48), 48]} yaw={0.3} />
      <ParkBench position={[48, config.getHeight(48, 88), 88]} yaw={-0.5} />
      <StreetLamp position={[18, config.getHeight(18, 40), 40]} />
      <StreetLamp position={[40, config.getHeight(40, 62), 62]} />
      <StreetLamp position={[72, config.getHeight(72, 95), 95]} />
      <StreetLamp position={[105, config.getHeight(105, 120), 120]} />
      <Billboard position={[35, config.getHeight(35, 75), 75]} />
      <Billboard position={[125, config.getHeight(125, 140), 140]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.15, -40]}>
        <planeGeometry args={[480, 36, 1, 1]} />
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
