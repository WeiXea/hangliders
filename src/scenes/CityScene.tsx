import { useMemo, type ReactElement } from 'react'
import { Text } from '@react-three/drei'
import type { BiomeConfig } from '../types/game'
import {
  CITY_BUILDINGS,
  buildingDepth,
  type CityBuilding,
} from '../game/cityBuildings'
import { useGameStore } from '../game/gameStore'
import {
  DetailedTerrain,
  HorizonRing,
  OceanSurface,
} from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'
import { CityLife } from './CityLife'
import { CityAirport } from './CityAirport'
import { CityLaunchPad, RocketTower } from './CityLaunchPad'
import {
  CITY_GARAGES,
  TUNNEL_SEGMENTS,
} from '../game/cityUnderground'
import { CityFeatureMarkers } from './CityFeatureMarkers'
import { CityToyTown } from './CityToyTown'
import {
  GarageInteriorView,
  ThemedBuildingInterior,
  TunnelNetworkView,
} from './cityInteriors'

interface CitySceneProps {
  config: BiomeConfig
}

/** Flat-shaded toy-town building — Sketchfab low-poly city look. */
function Building({
  building,
  groundY,
}: {
  building: CityBuilding
  groundY: number
}) {
  const { width, height, color, windows, enterable, roofLandable, shop, shopColor } = building
  const depth = buildingDepth(building)
  const rows = Math.max(1, Math.floor(height / 3.2))
  const cols = Math.max(1, Math.floor(width / 2.2))
  const doorW = 1.9
  const doorH = 2.4
  const halfD = depth / 2
  const roofColor = shopColor ?? '#6c757d'
  const isHospital = shop === 'HOSPITAL'
  // Short blocks get gabled roofs like the Sketchfab residential/shop houses
  const usePitch = height <= 12 && !isHospital

  return (
    <group position={[building.x, groundY, building.z]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.92} metalness={0} flatShading />
      </mesh>

      {usePitch ? (
        <>
          <mesh
            castShadow
            position={[0, height + 1.1, 0]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <boxGeometry args={[Math.hypot(width, width) * 0.52, 0.22, depth * 1.08]} />
            <meshStandardMaterial color={shopColor ?? '#4a5568'} roughness={0.85} flatShading />
          </mesh>
          <mesh
            castShadow
            position={[0, height + 1.1, 0]}
            rotation={[0, 0, -Math.PI / 4]}
          >
            <boxGeometry args={[Math.hypot(width, width) * 0.52, 0.22, depth * 1.08]} />
            <meshStandardMaterial color={shopColor ?? '#5c6778'} roughness={0.85} flatShading />
          </mesh>
          <mesh position={[width * 0.28, height + 1.9, 0]}>
            <boxGeometry args={[0.35, 1.1, 0.35]} />
            <meshStandardMaterial color="#ced4da" roughness={0.8} flatShading />
          </mesh>
        </>
      ) : (
        <mesh castShadow receiveShadow position={[0, height + 0.12, 0]}>
          <boxGeometry args={[width * 1.02, 0.28, depth * 1.02]} />
          <meshStandardMaterial color={isHospital ? '#4cc9f0' : roofColor} roughness={0.85} flatShading />
        </mesh>
      )}

      {roofLandable && !usePitch && (
        <>
          <mesh position={[0, height + 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width * 0.9, depth * 0.9]} />
            <meshStandardMaterial color="#adb5bd" roughness={0.9} flatShading />
          </mesh>
          <mesh castShadow position={[width * 0.2, height + 0.65, -depth * 0.15]}>
            <boxGeometry args={[1.2, 0.7, 1]} />
            <meshStandardMaterial color="#868e96" roughness={0.75} flatShading />
          </mesh>
          {isHospital && (
            <group position={[0, height + 0.35, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.6, 20]} />
                <meshStandardMaterial color="#4cc9f0" roughness={0.7} flatShading />
              </mesh>
              <Text position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.7} color="#f8f9fa" anchorX="center" anchorY="middle">
                H
              </Text>
            </group>
          )}
        </>
      )}

      {/* Fewer window panes on tall faces — still reads as a grid */}
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: Math.min(cols, 4) }).map((_, col) => {
          const lit = windows[(row * cols + col) % windows.length]
          const wx = (col - Math.min(cols, 4) / 2 + 0.5) * (width / Math.min(cols, 4))
          if (enterable && row === 0 && Math.abs(wx) < doorW * 0.55) return null
          return (
            <mesh key={`${row}-${col}`} position={[wx, row * 3.1 + 1.6, halfD + 0.03]}>
              <boxGeometry args={[Math.min(1.35, width / Math.min(cols, 4) - 0.35), 1.5, 0.08]} />
              <meshStandardMaterial
                color={lit ? '#90e0ef' : '#495057'}
                emissive={lit ? '#74c0fc' : '#000000'}
                emissiveIntensity={lit ? 0.35 : 0}
                roughness={0.35}
                flatShading
              />
            </mesh>
          )
        }),
      )}

      {shop && (
        <mesh position={[0, doorH + 0.55, halfD + 0.35]}>
          <boxGeometry args={[width * 0.92, 0.55, 0.7]} />
          <meshStandardMaterial color={shopColor ?? '#e63946'} roughness={0.7} flatShading />
        </mesh>
      )}
      {shop &&
        Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`awn-${i}`} position={[-width * 0.35 + i * (width * 0.175), doorH + 0.55, halfD + 0.72]}>
            <boxGeometry args={[width * 0.14, 0.12, 0.08]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#f8f9fa' : shopColor ?? '#e63946'} roughness={0.75} flatShading />
          </mesh>
        ))}

      {enterable && (
        <group position={[0, 0, halfD + 0.02]}>
          <mesh position={[0, doorH / 2, 0]}>
            <boxGeometry args={[doorW, doorH, 0.12]} />
            <meshStandardMaterial color="#343a40" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 0.03, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[doorW * 1.4, 1.3]} />
            <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.4} roughness={1} />
          </mesh>
          <Text position={[0, 0.1, 0.68]} fontSize={0.3} color="#d8f3dc" anchorX="center">
            E
          </Text>
        </group>
      )}

      {shop && (
        <group position={[0, 0, halfD + 0.06]}>
          <mesh castShadow position={[0, 3.0, 0.5]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[Math.min(width * 0.95, 8), 0.1, 1.4]} />
            <meshStandardMaterial
              color={shopColor ?? '#e63946'}
              roughness={0.7}
              flatShading
            />
          </mesh>
          <mesh position={[0, 3.55, 0.1]}>
            <boxGeometry args={[Math.min(width * 0.9, 7), 0.95, 0.2]} />
            <meshStandardMaterial color={shopColor ?? '#e63946'} roughness={0.65} flatShading />
          </mesh>
          <Text
            position={[0, 3.55, 0.24]}
            fontSize={0.4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            maxWidth={Math.min(width * 0.8, 6)}
            outlineWidth={0.025}
            outlineColor="#000"
          >
            {shop}
          </Text>
        </group>
      )}
    </group>
  )
}

function CitySubSurface({ config }: { config: BiomeConfig }) {
  const interiorId = useGameStore((s) => s.flight.interiorId)
  const tunnelSegment = useGameStore((s) => s.flight.tunnelSegment)
  const garageId = useGameStore((s) => s.flight.garageId)
  const px = useGameStore((s) => s.flight.position.x)
  const pz = useGameStore((s) => s.flight.position.z)

  if (interiorId >= 0) {
    const b = CITY_BUILDINGS.find((x) => x.id === interiorId)
    if (!b || !b.enterable) return null
    return (
      <>
        <color attach="background" args={['#1a1410']} />
        <fog attach="fog" args={['#1a1410', 8, 28]} />
        <ambientLight intensity={0.45} />
        <ThemedBuildingInterior building={b} groundY={config.getHeight(b.x, b.z)} isolated />
      </>
    )
  }

  if (tunnelSegment >= 0) {
    const seg = TUNNEL_SEGMENTS.find((s) => s.id === tunnelSegment)
    if (!seg) return null
    return (
      <>
        <color attach="background" args={['#12161c']} />
        <fog attach="fog" args={['#12161c', 18, 85]} />
        <TunnelNetworkView
          playerX={px}
          playerZ={pz}
          getHeight={config.getHeight}
          currentLabel={seg.label}
        />
      </>
    )
  }

  if (garageId >= 0) {
    const g = CITY_GARAGES.find((gar) => gar.id === garageId)
    if (!g) return null
    return (
      <>
        <color attach="background" args={['#1a1d21']} />
        <fog attach="fog" args={['#1a1d21', 12, 42]} />
        <GarageInteriorView
          label={g.label}
          x={g.x}
          z={g.z}
          yaw={g.yaw}
          groundY={config.getHeight(g.x, g.z) + 0.12 - 0.35}
        />
      </>
    )
  }
  return null
}

function CityStreets({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const parts = useMemo(() => {
    const result: ReactElement[] = []
    const xMin = -55
    const xMax = 235
    const zMin = -15
    const zMax = 205
    const step = 22
    const roadW = 11
    const swW = 2.8
    const asphaltH = 0.14
    const xs: number[] = []
    const zs: number[] = []
    for (let x = -44; x <= 220; x += step) xs.push(x)
    for (let z = 0; z <= 198; z += step) zs.push(z)

    const roadLenX = xMax - xMin
    const roadLenZ = zMax - zMin
    const midX = (xMin + xMax) / 2
    const midZ = (zMin + zMax) / 2
    const asphalt = '#2b2d31'
    const sidewalk = '#e9ecef'
    const paint = '#f8f9fa'

    for (const z of zs) {
      const base = getHeight(midX, z)
      result.push(
        <mesh key={`road-h-${z}`} position={[midX, base + asphaltH * 0.5, z]} receiveShadow>
          <boxGeometry args={[roadLenX, asphaltH, roadW]} />
          <meshStandardMaterial color={asphalt} roughness={0.95} flatShading />
        </mesh>,
      )
      // One continuous center stripe per road (cheap; still reads as paint from street level)
      result.push(
        <mesh key={`line-h-${z}`} position={[midX, base + asphaltH + 0.02, z]}>
          <boxGeometry args={[roadLenX * 0.96, 0.03, 0.2]} />
          <meshStandardMaterial color={paint} roughness={0.8} flatShading />
        </mesh>,
      )
      for (const side of [-1, 1] as const) {
        result.push(
          <mesh
            key={`sw-h-${z}-${side}`}
            position={[midX, base + asphaltH + 0.04, z + side * (roadW * 0.5 + swW * 0.5 + 0.15)]}
            receiveShadow
          >
            <boxGeometry args={[roadLenX, 0.1, swW]} />
            <meshStandardMaterial color={sidewalk} roughness={0.9} flatShading />
          </mesh>,
        )
      }
    }

    for (const x of xs) {
      const base = getHeight(x, midZ)
      result.push(
        <mesh key={`road-v-${x}`} position={[x, base + asphaltH * 0.5, midZ]} receiveShadow>
          <boxGeometry args={[roadW, asphaltH, roadLenZ]} />
          <meshStandardMaterial color={asphalt} roughness={0.95} flatShading />
        </mesh>,
      )
      result.push(
        <mesh key={`line-v-${x}`} position={[x, base + asphaltH + 0.02, midZ]}>
          <boxGeometry args={[0.2, 0.03, roadLenZ * 0.96]} />
          <meshStandardMaterial color={paint} roughness={0.8} flatShading />
        </mesh>,
      )
      for (const side of [-1, 1] as const) {
        result.push(
          <mesh
            key={`sw-v-${x}-${side}`}
            position={[x + side * (roadW * 0.5 + swW * 0.5 + 0.15), base + asphaltH + 0.04, midZ]}
            receiveShadow
          >
            <boxGeometry args={[swW, 0.1, roadLenZ]} />
            <meshStandardMaterial color={sidewalk} roughness={0.9} flatShading />
          </mesh>,
        )
      }
    }

    // Zebra crosswalks at key intersections only (4 approaches × 5 stripes)
    const hubs = [
      [0, 44],
      [44, 44],
      [66, 66],
      [110, 66],
      [44, 110],
      [110, 110],
      [132, 132],
      [66, 154],
    ] as const
    for (const [x, z] of hubs) {
      const base = getHeight(x, z) + asphaltH + 0.025
      for (let k = 0; k < 5; k++) {
        const o = -2.0 + k * 1.0
        result.push(
          <mesh key={`xw-n-${x}-${z}-${k}`} position={[x + o, base, z + 5.1]}>
            <boxGeometry args={[0.55, 0.025, 2.0]} />
            <meshStandardMaterial color={paint} roughness={0.85} flatShading />
          </mesh>,
        )
        result.push(
          <mesh key={`xw-s-${x}-${z}-${k}`} position={[x + o, base, z - 5.1]}>
            <boxGeometry args={[0.55, 0.025, 2.0]} />
            <meshStandardMaterial color={paint} roughness={0.85} flatShading />
          </mesh>,
        )
        result.push(
          <mesh key={`xw-e-${x}-${z}-${k}`} position={[x + 5.1, base, z + o]}>
            <boxGeometry args={[2.0, 0.025, 0.55]} />
            <meshStandardMaterial color={paint} roughness={0.85} flatShading />
          </mesh>,
        )
        result.push(
          <mesh key={`xw-w-${x}-${z}-${k}`} position={[x - 5.1, base, z + o]}>
            <boxGeometry args={[2.0, 0.025, 0.55]} />
            <meshStandardMaterial color={paint} roughness={0.85} flatShading />
          </mesh>,
        )
      }
    }

    return result
  }, [getHeight])

  return <group>{parts}</group>
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
      <mesh position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 4.0, 6]} />
        <meshStandardMaterial color="#868e96" roughness={0.55} flatShading />
      </mesh>
      <mesh position={[0.55, 4.05, 0]} rotation={[0, 0, -0.9]}>
        <boxGeometry args={[0.08, 1.1, 0.08]} />
        <meshStandardMaterial color="#868e96" roughness={0.55} flatShading />
      </mesh>
      <mesh position={[1.05, 3.55, 0]}>
        <boxGeometry args={[0.45, 0.14, 0.28]} />
        <meshStandardMaterial color="#ffe066" emissive="#ffe066" emissiveIntensity={0.45} roughness={0.5} flatShading />
      </mesh>
    </group>
  )
}

export function CityScene({ config }: CitySceneProps) {
  const rocketElevY = useGameStore((s) =>
    s.flight.phase === 'rocketElevator' ? s.flight.rocketMission?.elevatorY : undefined,
  )
  const interiorId = useGameStore((s) => s.flight.interiorId)
  const tunnelSegment = useGameStore((s) => s.flight.tunnelSegment)
  const garageId = useGameStore((s) => s.flight.garageId)
  /** Shop / tunnel / garage each replace the outdoor city with an isolated space. */
  const indoors = interiorId >= 0 || tunnelSegment >= 0 || garageId >= 0

  if (indoors) {
    return <CitySubSurface config={config} />
  }

  return (
    <>
      <SharedSky config={config} />
      <SharedLighting config={config} />
      <DetailedTerrain config={config} biome="city" size={1280} segments={48} />
      <HorizonRing color="#8ecae6" y={0} />
      <CityToyTown getHeight={config.getHeight} />
      <CityStreets getHeight={config.getHeight} />
      <CityFeatureMarkers getHeight={config.getHeight} />
      {CITY_BUILDINGS.map((b) => (
        <Building key={b.id} building={b} groundY={config.getHeight(b.x, b.z)} />
      ))}
      <CityLife />
      <CityAirport />
      <CityLaunchPad />
      <RocketTower elevatorY={rocketElevY} />
      <ParkBench position={[22, config.getHeight(22, 48), 48]} yaw={0.3} />
      <ParkBench position={[48, config.getHeight(48, 88), 88]} yaw={-0.5} />
      <ParkBench position={[90, config.getHeight(90, 130), 130]} yaw={0.8} />
      <StreetLamp position={[18, config.getHeight(18, 40), 40]} />
      <StreetLamp position={[40, config.getHeight(40, 62), 62]} />
      <StreetLamp position={[72, config.getHeight(72, 95), 95]} />
      <StreetLamp position={[105, config.getHeight(105, 120), 120]} />
      <StreetLamp position={[160, config.getHeight(160, 150), 150]} />
      <StreetLamp position={[55, config.getHeight(55, 30), 30]} />
      <OceanSurface
        y={-0.55}
        scale={[980, 160]}
        deep="#023e8a"
        shallow="#48cae4"
        position={[40, 0, -60]}
        followAxis="none"
      />
    </>
  )
}
