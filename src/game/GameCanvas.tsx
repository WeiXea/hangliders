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
import { ChallengeRings, LandingZone } from '../scenes/ChallengeObjects'
import { FlightPostFX } from '../scenes/SharedSky'

function BiomeWorld() {
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]

  switch (biome) {
    case 'mountains':
      return <MountainScene config={config} />
    case 'city':
      return <CityScene config={config} />
    default:
      return <BeachScene config={config} />
  }
}

export function GameCanvas() {
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [config.launchPosition.x, 20, config.launchPosition.z - 15], fov: 58, near: 0.1, far: 2200 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#87b8e8']} />
      <Suspense fallback={null}>
        <BiomeWorld />
        <HangGlider />
        <RemotePlayer />
        <ParkedGliders />
        <ChallengeRings />
        <LandingZone />
        <FlightSimulator />
        <FlightPostFX />
      </Suspense>
    </Canvas>
  )
}
