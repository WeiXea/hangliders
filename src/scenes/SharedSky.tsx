import { Cloud, Environment, Sky, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import type { BiomeConfig } from '../types/game'
import { biomeHdriPath } from '../game/pbrMaps'

export function SharedSky({ config }: { config: BiomeConfig }) {
  const [sx, sy, sz] = config.sunPosition
  const turbidity = config.skyTurbidity * 1.08
  const rayleigh = config.skyRayleigh * 0.95
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[sx, sy * 0.92, sz]}
        inclination={0.52}
        azimuth={0.22}
        turbidity={turbidity}
        rayleigh={rayleigh}
        mieCoefficient={0.005}
        mieDirectionalG={0.9}
      />
      <Environment
        files={biomeHdriPath(config.id)}
        environmentIntensity={0.88}
        background={false}
      />
      <CloudLayers config={config} />
      <fog
        attach="fog"
        args={[config.fogColor, config.fogNear * 0.7, config.fogFar * 1.12]}
      />
    </>
  )
}

function CloudLayers({ config }: { config: BiomeConfig }) {
  const clouds: [number, number, number, number][] =
    config.id === 'mountains'
      ? [
          [80, 110, 60, 1.8], [-60, 130, 100, 2.2], [160, 120, 140, 1.5],
          [220, 100, 50, 1.9], [20, 140, 180, 2.4], [-100, 115, 40, 1.6],
          [280, 125, 200, 2], [120, 150, 260, 1.7],
        ]
      : config.id === 'city'
        ? [
            [60, 85, 80, 1.2], [120, 100, 140, 1.5], [-40, 90, 160, 1.1],
            [200, 80, 100, 1.3], [40, 110, 220, 1.4], [260, 95, 180, 1.2],
          ]
        : [
            [50, 80, 90, 1.3], [140, 95, 140, 1.6], [-70, 85, 180, 1.2],
            [200, 75, 80, 1.1], [20, 105, 230, 1.8], [280, 90, 160, 1.4],
            [320, 100, 280, 1.5], [-40, 90, 300, 1.3],
          ]

  return (
    <>
      {clouds.map(([x, y, z, s], i) => (
        <Cloud
          key={i}
          opacity={0.42}
          speed={0.06}
          bounds={[42 * s, 8, 26 * s]}
          segments={12}
          position={[x, y, z]}
          color="#fff7eb"
        />
      ))}
    </>
  )
}

export function SharedLighting({ config }: { config?: BiomeConfig }) {
  const [sx, sy, sz] = config?.sunPosition ?? [140, 160, 90]
  return (
    <>
      {/* SoftShadows removed — caused shimmer / “landscape changing” on large flats */}
      <ambientLight intensity={0.24} color="#ffd6a5" />
      <directionalLight
        position={[sx, sy, sz]}
        intensity={2.45}
        color="#ffe0b8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={350}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[-70, 55, -40]} intensity={0.38} color="#9ec9e8" />
      <hemisphereLight args={['#ffc97a', '#4a6741', 0.55]} />
      <mesh position={[sx * 0.4, sy * 0.4, sz * 0.4]}>
        <sphereGeometry args={[18, 16, 16]} />
        <meshBasicMaterial color="#ffe8c8" transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </>
  )
}

/** Lightweight post — avoid multi-pass stacks that stutter on mobile. */
export function FlightPostFX() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom luminanceThreshold={0.95} intensity={0.12} mipmapBlur />
      <Vignette offset={0.3} darkness={0.32} />
    </EffectComposer>
  )
}

export function GliderContactShadow() {
  return (
    <ContactShadows
      position={[0, -0.02, 0]}
      opacity={0.5}
      scale={18}
      blur={2.4}
      far={12}
      resolution={256}
      color="#1a1a1a"
    />
  )
}
