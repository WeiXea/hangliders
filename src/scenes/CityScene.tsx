import { useMemo, type ReactElement } from 'react'
import { Text } from '@react-three/drei'
import type { BiomeConfig } from '../types/game'
import {
  CITY_BUILDINGS,
  buildingDepth,
  type CityBuilding,
} from '../game/cityBuildings'
import { useCityUrbanMaps } from '../game/cityUrbanMats'
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

type UrbanMaps = ReturnType<typeof useCityUrbanMaps>

/** Urban building — concrete PBR shell, glass windows, shop fascia. */
function Building({
  building,
  groundY,
  urban,
}: {
  building: CityBuilding
  groundY: number
  urban: UrbanMaps
}) {
  const { width, height, color, windows, enterable, roofLandable, shop, shopColor } = building
  const depth = buildingDepth(building)
  const rows = Math.max(1, Math.floor(height / 3.2))
  const cols = Math.max(1, Math.floor(width / 2.2))
  const doorW = 1.9
  const doorH = 2.4
  const halfD = depth / 2
  const isHospital = shop === 'HOSPITAL'
  const winCols = Math.min(cols, 5)

  return (
    <group position={[building.x, groundY, building.z]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          map={urban.facade.map}
          normalMap={urban.facade.normalMap}
          roughnessMap={urban.facade.roughnessMap}
          normalScale={urban.normalScale}
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>

      {/* Parapet roof */}
      <mesh castShadow receiveShadow position={[0, height + 0.18, 0]}>
        <boxGeometry args={[width * 1.04, 0.36, depth * 1.04]} />
        <meshStandardMaterial color="#3d4248" roughness={0.9} metalness={0.12} />
      </mesh>

      {roofLandable && (
        <>
          <mesh position={[0, height + 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[width * 0.88, depth * 0.88]} />
            <meshStandardMaterial
              color="#5a6169"
              map={urban.asphalt.map}
              roughness={0.92}
              metalness={0.05}
            />
          </mesh>
          <mesh castShadow position={[width * 0.22, height + 0.85, -depth * 0.18]}>
            <boxGeometry args={[1.35, 0.85, 1.1]} />
            <meshStandardMaterial color="#6c757d" roughness={0.75} metalness={0.2} />
          </mesh>
          {isHospital && (
            <group position={[0, height + 0.45, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.7, 28]} />
                <meshStandardMaterial color="#1d8a99" roughness={0.55} metalness={0.15} />
              </mesh>
              <Text position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.75} color="#f8f9fa" anchorX="center" anchorY="middle">
                H
              </Text>
            </group>
          )}
        </>
      )}

      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: winCols }).map((_, col) => {
          const lit = windows[(row * cols + col) % windows.length]
          const wx = (col - winCols / 2 + 0.5) * (width / winCols)
          if (enterable && row === 0 && Math.abs(wx) < doorW * 0.55) return null
          return (
            <mesh key={`${row}-${col}`} position={[wx, row * 3.1 + 1.6, halfD + 0.04]} castShadow>
              <boxGeometry args={[Math.min(1.4, width / winCols - 0.3), 1.55, 0.1]} />
              <meshPhysicalMaterial
                color={lit ? '#8ecae6' : '#1a2330'}
                emissive={lit ? '#4cc9f0' : '#0a1018'}
                emissiveIntensity={lit ? 0.25 : 0.05}
                metalness={0.55}
                roughness={0.12}
                clearcoat={0.6}
                clearcoatRoughness={0.2}
                transparent
                opacity={0.92}
              />
            </mesh>
          )
        }),
      )}

      {shop && (
        <mesh position={[0, doorH + 0.35, halfD + 0.28]} castShadow>
          <boxGeometry args={[width * 0.96, 0.7, 0.55]} />
          <meshStandardMaterial color={shopColor ?? '#b91c1c'} roughness={0.55} metalness={0.15} />
        </mesh>
      )}

      {enterable && (
        <group position={[0, 0, halfD + 0.02]}>
          <mesh position={[0, doorH / 2, 0]} castShadow>
            <boxGeometry args={[doorW, doorH, 0.14]} />
            <meshStandardMaterial color="#1c1f24" roughness={0.55} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.03, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[doorW * 1.35, 1.2]} />
            <meshStandardMaterial color="#2d6a4f" emissive="#2d6a4f" emissiveIntensity={0.25} roughness={0.85} />
          </mesh>
          <Text position={[0, 0.1, 0.62]} fontSize={0.28} color="#d8f3dc" anchorX="center">
            E
          </Text>
        </group>
      )}

      {shop && (
        <group position={[0, 0, halfD + 0.08]}>
          <mesh castShadow position={[0, 3.45, 0.12]}>
            <boxGeometry args={[Math.min(width * 0.92, 7.2), 0.9, 0.22]} />
            <meshStandardMaterial color={shopColor ?? '#b91c1c'} roughness={0.5} metalness={0.2} />
          </mesh>
          <Text
            position={[0, 3.45, 0.26]}
            fontSize={0.38}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            maxWidth={Math.min(width * 0.8, 6)}
            outlineWidth={0.02}
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

function CityStreets({
  getHeight,
  urban,
}: {
  getHeight: (x: number, z: number) => number
  urban: UrbanMaps
}) {
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
    const paint = '#e8eaed'

    for (const z of zs) {
      const base = getHeight(midX, z)
      result.push(
        <mesh key={`road-h-${z}`} position={[midX, base + asphaltH * 0.5, z]} receiveShadow>
          <boxGeometry args={[roadLenX, asphaltH, roadW]} />
          <meshStandardMaterial
            color={urban.asphaltTint}
            map={urban.asphalt.map}
            normalMap={urban.asphalt.normalMap}
            roughnessMap={urban.asphalt.roughnessMap}
            normalScale={urban.normalScale}
            roughness={0.94}
            metalness={0.04}
          />
        </mesh>,
      )
      result.push(
        <mesh key={`line-h-${z}`} position={[midX, base + asphaltH + 0.02, z]}>
          <boxGeometry args={[roadLenX * 0.96, 0.03, 0.16]} />
          <meshStandardMaterial color={paint} roughness={0.75} />
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
            <meshStandardMaterial
              color={urban.sidewalkTint}
              map={urban.sidewalk.map}
              normalMap={urban.sidewalk.normalMap}
              roughnessMap={urban.sidewalk.roughnessMap}
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>,
        )
      }
    }

    for (const x of xs) {
      const base = getHeight(x, midZ)
      result.push(
        <mesh key={`road-v-${x}`} position={[x, base + asphaltH * 0.5, midZ]} receiveShadow>
          <boxGeometry args={[roadW, asphaltH, roadLenZ]} />
          <meshStandardMaterial
            color={urban.asphaltTint}
            map={urban.asphalt.map}
            normalMap={urban.asphalt.normalMap}
            roughnessMap={urban.asphalt.roughnessMap}
            normalScale={urban.normalScale}
            roughness={0.94}
            metalness={0.04}
          />
        </mesh>,
      )
      result.push(
        <mesh key={`line-v-${x}`} position={[x, base + asphaltH + 0.02, midZ]}>
          <boxGeometry args={[0.16, 0.03, roadLenZ * 0.96]} />
          <meshStandardMaterial color={paint} roughness={0.75} />
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
            <meshStandardMaterial
              color={urban.sidewalkTint}
              map={urban.sidewalk.map}
              normalMap={urban.sidewalk.normalMap}
              roughnessMap={urban.sidewalk.roughnessMap}
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>,
        )
      }
    }

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
            <meshStandardMaterial color={paint} roughness={0.8} />
          </mesh>,
        )
        result.push(
          <mesh key={`xw-s-${x}-${z}-${k}`} position={[x + o, base, z - 5.1]}>
            <boxGeometry args={[0.55, 0.025, 2.0]} />
            <meshStandardMaterial color={paint} roughness={0.8} />
          </mesh>,
        )
        result.push(
          <mesh key={`xw-e-${x}-${z}-${k}`} position={[x + 5.1, base, z + o]}>
            <boxGeometry args={[2.0, 0.025, 0.55]} />
            <meshStandardMaterial color={paint} roughness={0.8} />
          </mesh>,
        )
        result.push(
          <mesh key={`xw-w-${x}-${z}-${k}`} position={[x - 5.1, base, z + o]}>
            <boxGeometry args={[2.0, 0.025, 0.55]} />
            <meshStandardMaterial color={paint} roughness={0.8} />
          </mesh>,
        )
      }
    }

    return result
  }, [getHeight, urban])

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
  const urban = useCityUrbanMaps()
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
      <DetailedTerrain config={config} biome="city" size={1280} segments={64} />
      <HorizonRing color="#6b8cae" y={0} />
      <CityToyTown getHeight={config.getHeight} urban={urban} />
      <CityStreets getHeight={config.getHeight} urban={urban} />
      <CityFeatureMarkers getHeight={config.getHeight} />
      {CITY_BUILDINGS.map((b) => (
        <Building key={b.id} building={b} groundY={config.getHeight(b.x, b.z)} urban={urban} />
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
