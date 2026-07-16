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
import { CityToyTown } from './CityToyTown'
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
      {/* Grass lots under Kenney structures */}
      <CityToyTown getHeight={config.getHeight} urban={urban} lite />
      {/* Asphalt underlay — Kenney road tiles sit on top */}
      <CityStreets getHeight={config.getHeight} urban={urban} />
      <KenneyCity getHeight={config.getHeight} />
      <CityFeatureMarkers getHeight={config.getHeight} />
      <CityLife />
      <CityAirport />
      <CityLaunchPad />
      <RocketTower elevatorY={rocketElevY} />
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
