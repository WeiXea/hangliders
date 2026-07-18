import { useMemo, type ReactElement } from 'react'
import type { BiomeConfig } from '../types/game'
import { CITY_BUILDINGS } from '../game/cityBuildings'
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
import { KenneyCity, preloadKenneyCity } from './KenneyCity'
import {
  GarageInteriorView,
  ThemedBuildingInterior,
  TunnelNetworkView,
} from './cityInteriors'

preloadKenneyCity()

interface CitySceneProps {
  config: BiomeConfig
}

type UrbanMaps = ReturnType<typeof useCityUrbanMaps>

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

    // Asphalt + centerline only (sidewalks / zebra meshes were hundreds of draw calls)
    for (const z of zs) {
      const base = getHeight(midX, z)
      result.push(
        <mesh key={`road-h-${z}`} position={[midX, base + asphaltH * 0.5, z]}>
          <boxGeometry args={[roadLenX, asphaltH, roadW]} />
          <meshStandardMaterial
            color={urban.asphaltTint}
            map={urban.asphalt.map}
            roughness={0.94}
            metalness={0.04}
          />
        </mesh>,
      )
      result.push(
        <mesh key={`line-h-${z}`} position={[midX, base + asphaltH + 0.02, z]}>
          <boxGeometry args={[roadLenX * 0.96, 0.03, 0.16]} />
          <meshStandardMaterial color={paint} roughness={0.8} />
        </mesh>,
      )
    }

    for (const x of xs) {
      const base = getHeight(x, midZ)
      result.push(
        <mesh key={`road-v-${x}`} position={[x, base + asphaltH * 0.5, midZ]}>
          <boxGeometry args={[roadW, asphaltH, roadLenZ]} />
          <meshStandardMaterial
            color={urban.asphaltTint}
            map={urban.asphalt.map}
            roughness={0.94}
            metalness={0.04}
          />
        </mesh>,
      )
      result.push(
        <mesh key={`line-v-${x}`} position={[x, base + asphaltH + 0.02, midZ]}>
          <boxGeometry args={[0.16, 0.03, roadLenZ * 0.96]} />
          <meshStandardMaterial color={paint} roughness={0.8} />
        </mesh>,
      )
    }

    return result
  }, [getHeight, urban])

  return <group>{parts}</group>
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
      <DetailedTerrain config={config} biome="city" size={3200} segments={28} />
      <HorizonRing color="#6b8cae" y={0} inner={1800} outer={3600} />
      <mesh
        position={[90, config.getHeight(90, 90) - 0.02, 90]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[480, 400]} />
        <meshStandardMaterial color={urban.lawnTint} roughness={0.96} />
      </mesh>
      <CityStreets getHeight={config.getHeight} urban={urban} />
      <KenneyCity getHeight={config.getHeight} />
      <CityFeatureMarkers getHeight={config.getHeight} />
      <CityLife />
      <CityAirport />
      <CityLaunchPad />
      <RocketTower elevatorY={rocketElevY} />
      <OceanSurface
        y={-0.55}
        scale={[1600, 420]}
        deep="#023e8a"
        shallow="#48cae4"
        position={[40, 0, -280]}
        followAxis="none"
      />
    </>
  )
}
