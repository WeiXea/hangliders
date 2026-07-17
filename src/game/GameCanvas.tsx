import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { BIOME_CONFIGS } from './biomeConfigs'
import { FlightSimulator } from './FlightSimulator'
import { HangGlider } from './HangGlider'
import { ParkedGliders } from './ParkedGliders'
import { RemotePlayer } from './RemotePlayer'
import { BeachScene } from '../scenes/BeachScene'
import { MountainScene } from '../scenes/MountainScene'
import { CityScene } from '../scenes/CityScene'
import { MoonScene } from '../scenes/MoonScene'
import { TankFarmScene } from '../scenes/TankFarmScene'
import { ChallengeRings, LandingZone } from '../scenes/ChallengeObjects'
import { FlightPostFX } from '../scenes/SharedSky'
import { ThermalMarkers } from '../scenes/ThermalMarkers'
import { RidgeLiftMarkers } from '../scenes/RidgeLiftMarkers'
import { FlightParticles } from '../scenes/FlightParticles'
import { XCTurnpoints } from '../scenes/XCObjects'

function BiomeWorld() {
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]

  switch (biome) {
    case 'mountains':
      return <MountainScene config={config} />
    case 'city':
      return <CityScene config={config} />
    case 'moon':
      return <MoonScene config={config} />
    case 'tankfarm':
      return <TankFarmScene config={config} />
    default:
      return <BeachScene config={config} />
  }
}

export function GameCanvas() {
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]
  const flight = useGameStore((s) => s.flight)
  const cityPad = useGameStore((s) => s.cityLaunchPadId)
  const camX =
    biome === 'city' && cityPad != null ? flight.position.x : config.launchPosition.x
  const camY =
    biome === 'city' && cityPad != null ? flight.position.y + 12 : 20
  const camZ =
    biome === 'city' && cityPad != null
      ? flight.position.z - 18
      : config.launchPosition.z - 15

  return (
    <Canvas
      shadows
      dpr={biome === 'tankfarm' || biome === 'city' ? 1 : [1, 1.25]}
      camera={{ position: [camX, camY, camZ], fov: 58, near: 0.1, far: biome === 'moon' ? 6000 : 1800 }}
      gl={{
        antialias: biome !== 'tankfarm' && biome !== 'city',
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure:
          biome === 'moon' ? 0.85 : biome === 'city' ? 1.12 : biome === 'tankfarm' ? 1.15 : 1.05,
        stencil: false,
      }}
      performance={{ min: biome === 'tankfarm' || biome === 'city' ? 0.4 : 0.5 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[biome === 'moon' ? '#000004' : '#87b8e8']} />
      <Suspense fallback={null}>
        <BiomeWorld />
        <HangGlider />
        <RemotePlayer />
        <ParkedGliders />
        <ChallengeRings />
        <LandingZone />
        <XCTurnpoints />
        <ThermalMarkers />
        <RidgeLiftMarkers />
        <FlightParticles />
        <FlightSimulator />
        <FlightPostFX />
      </Suspense>
    </Canvas>
  )
}
