import { Cloud, Environment, Sky, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { BiomeConfig } from '../types/game'

export function SharedSky({ config }: { config: BiomeConfig }) {
  const [sx, sy, sz] = config.sunPosition
  // Golden-hour bias: warmer turbidity, softer rayleigh
  const turbidity = config.skyTurbidity * 1.15
  const rayleigh = config.skyRayleigh * 0.92
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[sx, sy * 0.92, sz]}
        inclination={0.52}
        azimuth={0.22}
        turbidity={turbidity}
        rayleigh={rayleigh}
        mieCoefficient={0.0055}
        mieDirectionalG={0.88}
      />
      <Environment preset="sunset" environmentIntensity={0.72} />
      <CloudLayers config={config} />
      <fog
        attach="fog"
        args={[config.fogColor, config.fogNear * 0.75, config.fogFar * 1.08]}
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
          opacity={0.48}
          speed={0.07}
          bounds={[42 * s, 8, 26 * s]}
          segments={20}
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
      <ambientLight intensity={0.32} color="#ffd6a5" />
      <directionalLight
        position={[sx, sy, sz]}
        intensity={2.9}
        color="#ffd7a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={600}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.00025}
      />
      <directionalLight position={[-70, 55, -40]} intensity={0.45} color="#8ecae6" />
      <hemisphereLight args={['#ffb703', '#5c7a52', 0.7]} />
      {/* Soft sun bloom disc + god-ray shafts */}
      <mesh position={[sx * 0.4, sy * 0.4, sz * 0.4]}>
        <sphereGeometry args={[18, 16, 16]} />
        <meshBasicMaterial color="#ffe8c8" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {[0, 0.35, -0.35, 0.7].map((a, i) => (
        <mesh
          key={i}
          position={[sx * 0.22, sy * 0.22, sz * 0.22]}
          rotation={[0.55 + a * 0.15, a, 0.2]}
        >
          <coneGeometry args={[14 + i * 3, 220, 4, 1, true]} />
          <meshBasicMaterial
            color="#ffe4c4"
            transparent
            opacity={0.035 - i * 0.005}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  )
}

/** Light post stack — bloom + AA. Keep cheap for mobile PWA. */
export function FlightPostFX() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        luminanceThreshold={0.78}
        luminanceSmoothing={0.35}
        intensity={0.48}
        mipmapBlur
      />
      <Vignette offset={0.22} darkness={0.42} />
    </EffectComposer>
  )
}

export function GliderContactShadow() {
  return (
    <ContactShadows
      position={[0, -0.02, 0]}
      opacity={0.45}
      scale={18}
      blur={2.2}
      far={12}
      resolution={256}
      color="#1a1a1a"
    />
  )
}
