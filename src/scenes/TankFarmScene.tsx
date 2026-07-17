import { Suspense, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { BiomeConfig } from '../types/game'
import { useTankfarmSurfaces, type TankfarmSurfaces } from '../game/tankfarmPbr'
import {
  FARM_BOXES,
  FARM_PLATFORMS,
  FARM_TANKS,
} from '../game/tankfarmWorld'

function IndustrialGround({
  getHeight,
  asphalt,
}: {
  getHeight: (x: number, z: number) => number
  asphalt: TankfarmSurfaces['asphalt']
}) {
  const geometry = useMemo(() => {
    const size = 420
    const segments = 64
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
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        map={asphalt.map}
        normalMap={asphalt.normalMap}
        roughnessMap={asphalt.roughnessMap}
        normalScale={asphalt.normalScale}
        color="#c8c2b6"
        roughness={0.95}
        metalness={0.04}
        envMapIntensity={0.55}
      />
    </mesh>
  )
}

function YardRoads({
  getHeight,
  asphalt,
}: {
  getHeight: (x: number, z: number) => number
  asphalt: TankfarmSurfaces['asphalt']
}) {
  const roads: [number, number, number, number][] = [
    [32, 58, 44, 12],
    [32, 80, 90, 10],
    [32, 100, 80, 10],
    [20, 80, 10, 70],
    [48, 80, 10, 70],
  ]
  return (
    <group>
      {roads.map(([x, z, w, d], i) => (
        <mesh
          key={i}
          receiveShadow
          position={[x, getHeight(x, z) + 0.06, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial
            map={asphalt.map}
            normalMap={asphalt.normalMap}
            roughnessMap={asphalt.roughnessMap}
            normalScale={asphalt.normalScale}
            color="#6a655c"
            roughness={0.98}
            metalness={0.02}
            envMapIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

function StorageTank({
  tank,
  groundY,
  surfaces,
}: {
  tank: (typeof FARM_TANKS)[number]
  groundY: number
  surfaces: TankfarmSurfaces
}) {
  const { radius: r, height: h } = tank
  const usePlate = tank.id % 2 === 1
  const mat = usePlate ? surfaces.plate : surfaces.rusty
  const metalness = usePlate ? 0.85 : 0.72
  const metalnessMap = usePlate ? surfaces.plate.metalnessMap : undefined
  return (
    <group position={[tank.x, groundY, tank.z]}>
      <mesh castShadow receiveShadow position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[r, r * 1.02, h, 40]} />
        <meshStandardMaterial
          map={mat.map}
          normalMap={mat.normalMap}
          roughnessMap={mat.roughnessMap}
          metalnessMap={metalnessMap}
          normalScale={mat.normalScale}
          color={tank.color}
          roughness={0.55}
          metalness={metalness}
          envMapIntensity={1.35}
        />
      </mesh>
      <mesh castShadow position={[0, h + 0.12, 0]}>
        <torusGeometry args={[r * 0.92, 0.2, 8, 36]} />
        <meshStandardMaterial
          map={surfaces.plate.map}
          normalMap={surfaces.plate.normalMap}
          roughnessMap={surfaces.plate.roughnessMap}
          metalnessMap={surfaces.plate.metalnessMap}
          color="#5a564e"
          roughness={0.45}
          metalness={0.9}
          envMapIntensity={1.4}
        />
      </mesh>
      <mesh castShadow position={[0, h, 0]}>
        <sphereGeometry args={[r * 0.92, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshStandardMaterial
          map={mat.map}
          normalMap={mat.normalMap}
          roughnessMap={mat.roughnessMap}
          metalnessMap={metalnessMap}
          color={tank.color}
          roughness={0.5}
          metalness={metalness}
          envMapIntensity={1.4}
        />
      </mesh>
      <mesh castShadow position={[0, h + r * 0.28, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 1.4, 10]} />
        <meshStandardMaterial
          map={surfaces.plate.map}
          metalnessMap={surfaces.plate.metalnessMap}
          color="#3a3832"
          roughness={0.4}
          metalness={0.95}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh castShadow position={[r + 0.18, h * 0.48, 0]}>
        <boxGeometry args={[0.2, h * 0.9, 0.75]} />
        <meshStandardMaterial
          map={surfaces.plate.map}
          metalnessMap={surfaces.plate.metalnessMap}
          color="#2e2c28"
          roughness={0.5}
          metalness={0.85}
        />
      </mesh>
      <mesh receiveShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[r * 1.12, r * 1.18, 0.55, 28]} />
        <meshStandardMaterial
          map={surfaces.rusty.map}
          normalMap={surfaces.rusty.normalMap}
          roughnessMap={surfaces.rusty.roughnessMap}
          color="#4a463e"
          roughness={0.85}
          metalness={0.35}
          envMapIntensity={0.7}
        />
      </mesh>
    </group>
  )
}

function PipeRun({
  x0,
  z0,
  x1,
  z1,
  y,
  r = 0.5,
  surfaces,
}: {
  x0: number
  z0: number
  x1: number
  z1: number
  y: number
  r?: number
  surfaces: TankfarmSurfaces
}) {
  const dx = x1 - x0
  const dz = z1 - z0
  const len = Math.hypot(dx, dz)
  const yaw = Math.atan2(dx, dz)
  return (
    <mesh
      castShadow
      position={[(x0 + x1) / 2, y, (z0 + z1) / 2]}
      rotation={[0, yaw, Math.PI / 2]}
    >
      <cylinderGeometry args={[r, r, len, 12]} />
      <meshStandardMaterial
        map={surfaces.plate.map}
        normalMap={surfaces.plate.normalMap}
        roughnessMap={surfaces.plate.roughnessMap}
        metalnessMap={surfaces.plate.metalnessMap}
        color="#6a655c"
        roughness={0.42}
        metalness={0.9}
        envMapIntensity={1.25}
      />
    </mesh>
  )
}

function Catwalk({
  platform,
  groundY,
  surfaces,
}: {
  platform: (typeof FARM_PLATFORMS)[number]
  groundY: number
  surfaces: TankfarmSurfaces
}) {
  const y = groundY + platform.deckH
  return (
    <group position={[platform.x, 0, platform.z]}>
      <mesh castShadow receiveShadow position={[0, y, 0]}>
        <boxGeometry args={[platform.w, 0.22, platform.d]} />
        <meshStandardMaterial
          map={surfaces.plate.map}
          normalMap={surfaces.plate.normalMap}
          metalnessMap={surfaces.plate.metalnessMap}
          color="#4a4842"
          roughness={0.55}
          metalness={0.8}
          envMapIntensity={1.1}
        />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} castShadow position={[0, y + 0.95, s * (platform.d * 0.5 - 0.12)]}>
          <boxGeometry args={[platform.w, 0.08, 0.08]} />
          <meshStandardMaterial color="#8a7a3a" roughness={0.45} metalness={0.7} />
        </mesh>
      ))}
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            castShadow
            position={[sx * platform.w * 0.4, y * 0.5, sz * platform.d * 0.35]}
          >
            <boxGeometry args={[0.2, y, 0.2]} />
            <meshStandardMaterial
              map={surfaces.rusty.map}
              color="#3a3832"
              roughness={0.6}
              metalness={0.75}
            />
          </mesh>
        )),
      )}
    </group>
  )
}

function Shed({
  box,
  groundY,
  surfaces,
}: {
  box: (typeof FARM_BOXES)[number]
  groundY: number
  surfaces: TankfarmSurfaces
}) {
  return (
    <group position={[box.x, groundY, box.z]}>
      <mesh castShadow receiveShadow position={[0, box.h * 0.5, 0]}>
        <boxGeometry args={[box.w, box.h, box.d]} />
        <meshStandardMaterial
          map={surfaces.rusty.map}
          normalMap={surfaces.rusty.normalMap}
          roughnessMap={surfaces.rusty.roughnessMap}
          color="#8a8070"
          roughness={0.82}
          metalness={0.25}
          envMapIntensity={0.7}
        />
      </mesh>
      <mesh castShadow position={[0, box.h + 0.35, 0]}>
        <boxGeometry args={[box.w * 1.08, 0.35, box.d * 1.08]} />
        <meshStandardMaterial
          map={surfaces.plate.map}
          metalnessMap={surfaces.plate.metalnessMap}
          color="#3d3a35"
          roughness={0.55}
          metalness={0.7}
        />
      </mesh>
    </group>
  )
}

function WalkableYard({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const surfaces = useTankfarmSurfaces()
  return (
    <group>
      <IndustrialGround getHeight={getHeight} asphalt={surfaces.asphalt} />
      <YardRoads getHeight={getHeight} asphalt={surfaces.asphalt} />
      {FARM_TANKS.map((t) => (
        <StorageTank
          key={t.id}
          tank={t}
          groundY={getHeight(t.x, t.z)}
          surfaces={surfaces}
        />
      ))}
      {FARM_PLATFORMS.map((p) => (
        <Catwalk
          key={p.id}
          platform={p}
          groundY={getHeight(p.x, p.z)}
          surfaces={surfaces}
        />
      ))}
      {FARM_BOXES.map((b) => (
        <Shed key={b.id} box={b} groundY={getHeight(b.x, b.z)} surfaces={surfaces} />
      ))}
      <PipeRun
        x0={18}
        z0={70}
        x1={48}
        z1={68}
        y={getHeight(33, 69) + 2.4}
        surfaces={surfaces}
      />
      <PipeRun
        x0={48}
        z0={68}
        x1={32}
        z1={88}
        y={getHeight(40, 78) + 2.6}
        surfaces={surfaces}
      />
      <PipeRun
        x0={32}
        z0={88}
        x1={10}
        z1={95}
        y={getHeight(21, 91) + 2.3}
        surfaces={surfaces}
      />
      <PipeRun
        x0={32}
        z0={88}
        x1={55}
        z1={95}
        y={getHeight(43, 91) + 2.8}
        r={0.6}
        surfaces={surfaces}
      />
    </group>
  )
}

export function TankFarmScene({ config }: { config: BiomeConfig }) {
  return (
    <>
      <fog attach="fog" args={['#8a8070', 140, 520]} />
      <ambientLight intensity={0.22} color="#e8dcc4" />
      <directionalLight
        position={[70, 95, 35]}
        intensity={1.35}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={220}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-bias={-0.00025}
      />
      <hemisphereLight args={['#d8cbb0', '#3a3530', 0.35]} />
      <Suspense fallback={null}>
        <Environment
          files="/env/tankfarm_4k.exr"
          background
          backgroundBlurriness={0.08}
          backgroundIntensity={0.95}
          environmentIntensity={1.35}
        />
      </Suspense>
      <Suspense fallback={null}>
        <WalkableYard getHeight={config.getHeight} />
      </Suspense>
    </>
  )
}
