import { Cloud, Environment, Sky } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import type { BiomeConfig } from '../types/game'

export function SharedSky({ config }: { config: BiomeConfig }) {
  const [sx, sy, sz] = config.sunPosition
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[sx, sy, sz]}
        inclination={0.49}
        azimuth={0.2}
        turbidity={config.skyTurbidity}
        rayleigh={config.skyRayleigh}
        mieCoefficient={0.004}
        mieDirectionalG={0.92}
      />
      <Environment preset="sunset" environmentIntensity={0.62} />
      <CloudLayers config={config} />
      {/* Soft height fog — slightly denser near horizon */}
      <fog attach="fog" args={[config.fogColor, config.fogNear * 0.85, config.fogFar * 1.05]} />
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
          opacity={0.5}
          speed={0.08}
          bounds={[42 * s, 8, 26 * s]}
          segments={22}
          position={[x, y, z]}
          color="#ffffff"
        />
      ))}
    </>
  )
}

export function SharedLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#e8f1f8" />
      <directionalLight
        position={[140, 160, 90]}
        intensity={2.7}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={600}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.00025}
      />
      <directionalLight position={[-70, 70, -40]} intensity={0.5} color="#8ecae6" />
      <hemisphereLight args={['#9AD0EC', '#5c7a52', 0.75]} />
    </>
  )
}

/** Light post stack — bloom + AA. Keep cheap for mobile PWA. */
export function FlightPostFX() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        luminanceThreshold={0.85}
        luminanceSmoothing={0.3}
        intensity={0.35}
        mipmapBlur
      />
      <Vignette offset={0.25} darkness={0.45} />
    </EffectComposer>
  )
}
