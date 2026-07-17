import { Suspense, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { BiomeConfig } from '../types/game'
import { useGroundMaps } from '../game/pbrMaps'

/**
 * Step 1 — Tank Farm world shell.
 * Sky/lighting from Poly Haven "Abandoned Tank Farm 03" EXR.
 * Ground + simple silos are placeholders; props/buildings come next.
 */
function IndustrialGround({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const maps = useGroundMaps('tankfarm')
  const geometry = useMemo(() => {
    const size = 900
    const segments = 72
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)))
    }
    geo.computeVertexNormals()
    return geo
  }, [getHeight])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        normalScale={maps.normalScale}
        color="#6a6660"
        roughness={maps.roughness}
        metalness={0.12}
        envMapIntensity={0.85}
      />
    </mesh>
  )
}

/** Temporary silos so the yard reads as a tank farm before real assets. */
function PlaceholderSilos({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const silos = useMemo(
    () =>
      [
        [60, 80, 7, 18],
        [85, 95, 9, 22],
        [110, 70, 6.5, 16],
        [140, 110, 8, 20],
        [50, 130, 7.5, 19],
        [170, 150, 10, 24],
        [-40, 100, 6, 15],
        [200, 90, 8.5, 21],
      ] as const,
    [],
  )

  return (
    <group>
      {silos.map(([x, z, r, h], i) => {
        const y = getHeight(x, z)
        return (
          <group key={i} position={[x, y, z]}>
            <mesh castShadow receiveShadow position={[0, h * 0.5, 0]}>
              <cylinderGeometry args={[r, r * 1.02, h, 20]} />
              <meshStandardMaterial color="#7a756c" roughness={0.78} metalness={0.35} envMapIntensity={1} />
            </mesh>
            <mesh castShadow position={[0, h + 0.35, 0]}>
              <cylinderGeometry args={[r * 0.15, r * 0.15, 0.7, 8]} />
              <meshStandardMaterial color="#5c5850" roughness={0.7} metalness={0.4} />
            </mesh>
            {/* Pipe stub */}
            <mesh castShadow position={[r + 1.2, 2.2, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.35, 0.35, 3.2, 8]} />
              <meshStandardMaterial color="#4a4842" roughness={0.65} metalness={0.5} />
            </mesh>
          </group>
        )
      })}
      {/* Service road strip */}
      <mesh receiveShadow position={[90, getHeight(90, 40) + 0.04, 40]} rotation={[-Math.PI / 2, 0, 0.08]}>
        <planeGeometry args={[220, 12]} />
        <meshStandardMaterial color="#3d3c39" roughness={0.95} metalness={0.05} />
      </mesh>
    </group>
  )
}

export function TankFarmScene({ config }: { config: BiomeConfig }) {
  return (
    <>
      <color attach="background" args={['#5c564c']} />
      <fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />
      <Suspense fallback={null}>
        <Environment
          files="/env/tankfarm_4k.exr"
          background
          backgroundBlurriness={0.02}
          environmentIntensity={1.05}
        />
      </Suspense>
      <ambientLight intensity={0.18} color="#d4c8b0" />
      <directionalLight
        position={config.sunPosition}
        intensity={1.65}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={400}
        shadow-camera-left={-160}
        shadow-camera-right={160}
        shadow-camera-top={160}
        shadow-camera-bottom={-160}
        shadow-bias={-0.0002}
      />
      <hemisphereLight args={['#c9b896', '#3a3832', 0.42]} />
      <Suspense fallback={null}>
        <IndustrialGround getHeight={config.getHeight} />
      </Suspense>
      <PlaceholderSilos getHeight={config.getHeight} />
    </>
  )
}
