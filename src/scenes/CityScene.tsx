import { useMemo, type ReactElement } from 'react'
import type { BiomeConfig } from '../types/game'
import { CITY_BUILDINGS, buildingDepth } from '../game/cityBuildings'
import { DetailedTerrain, HorizonRing, LaunchRamp } from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'

interface CitySceneProps {
  config: BiomeConfig
}

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

const BUILDINGS = CITY_BUILDINGS

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
      {BUILDINGS.map((b, i) => (
        <Building
          key={i}
          position={[b.x, config.getHeight(b.x, b.z), b.z]}
          width={b.width}
          depth={buildingDepth(b)}
          height={b.height}
          color={b.color}
          windows={b.windows}
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
