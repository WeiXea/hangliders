import { Cloud, Environment, Sky } from '@react-three/drei'
import type { BiomeConfig } from '../types/game'

export function SharedSky({ config }: { config: BiomeConfig }) {
  const [sx, sy, sz] = config.sunPosition
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[sx, sy, sz]}
        inclination={0.48}
        azimuth={0.2}
        turbidity={config.skyTurbidity}
        rayleigh={config.skyRayleigh}
        mieCoefficient={0.0035}
        mieDirectionalG={0.88}
      />
      <Environment preset="sunset" environmentIntensity={0.45} />
      <CloudLayers config={config} />
      <fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />
    </>
  )
}

function CloudLayers({ config }: { config: BiomeConfig }) {
  const clouds: [number, number, number, number][] =
    config.id === 'mountains'
      ? [
          [50, 95, 40, 1.6], [-30, 115, 70, 2], [90, 105, 90, 1.3],
          [140, 90, 30, 1.7], [10, 125, 110, 2.2], [-60, 100, 20, 1.4],
        ]
      : config.id === 'city'
        ? [
            [40, 75, 50, 1.1], [70, 90, 80, 1.4], [-20, 80, 100, 1],
            [110, 70, 60, 1.2],
          ]
        : [
            [30, 70, 60, 1.2], [80, 85, 90, 1.5], [-40, 75, 110, 1.1],
            [120, 65, 50, 1], [0, 90, 140, 1.6], [160, 80, 100, 1.3],
          ]

  return (
    <>
      {clouds.map(([x, y, z, s], i) => (
        <Cloud
          key={i}
          opacity={0.5}
          speed={0.12}
          bounds={[36 * s, 7, 22 * s]}
          segments={20}
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
      <ambientLight intensity={0.4} color="#dceaf5" />
      <directionalLight
        position={[100, 130, 70]}
        intensity={2.1}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={400}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-50, 60, -30]} intensity={0.4} color="#8ecae6" />
      <hemisphereLight args={['#89C2D9', '#588157', 0.55]} />
    </>
  )
}
