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
    const size = 360
    const segments = 32
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
        envMapIntensity={0.45}
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
            color="#6a655c"
            roughness={0.98}
            metalness={0.02}
            envMapIntensity={0.35}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Lean tank: body + cap only (no torus / ladder / multi-maps per part). */
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
  return (
    <group position={[tank.x, groundY, tank.z]}>
      <mesh castShadow receiveShadow position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[r, r * 1.02, h, 20]} />
        <meshStandardMaterial
          map={mat.map}
          normalMap={mat.normalMap}
          roughnessMap={mat.roughnessMap}
          color={tank.color}
          roughness={0.55}
          metalness={usePlate ? 0.82 : 0.68}
          envMapIntensity={1.1}
        />
      </mesh>
      <mesh castShadow position={[0, h, 0]}>
        <sphereGeometry args={[r * 0.92, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshStandardMaterial
          map={mat.map}
          color={tank.color}
          roughness={0.5}
          metalness={usePlate ? 0.82 : 0.68}
          envMapIntensity={1.15}
        />
      </mesh>
      <mesh receiveShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[r * 1.1, r * 1.14, 0.5, 16]} />
        <meshStandardMaterial color="#4a463e" roughness={0.9} metalness={0.25} />
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
    <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[0, yaw, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial
        map={surfaces.plate.map}
        color="#6a655c"
        roughness={0.45}
        metalness={0.85}
        envMapIntensity={1.0}
      />
    </mesh>
  )
}

function Catwalk({
  platform,
  groundY,
}: {
  platform: (typeof FARM_PLATFORMS)[number]
  groundY: number
}) {
  const y = groundY + platform.deckH
  return (
    <group position={[platform.x, 0, platform.z]}>
      <mesh castShadow receiveShadow position={[0, y, 0]}>
        <boxGeometry args={[platform.w, 0.22, platform.d]} />
        <meshStandardMaterial color="#4a4842" roughness={0.55} metalness={0.75} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[0, y + 0.95, s * (platform.d * 0.5 - 0.12)]}>
          <boxGeometry args={[platform.w, 0.08, 0.08]} />
          <meshStandardMaterial color="#8a7a3a" roughness={0.5} metalness={0.65} />
        </mesh>
      ))}
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            position={[sx * platform.w * 0.4, y * 0.5, sz * platform.d * 0.35]}
          >
            <boxGeometry args={[0.2, y, 0.2]} />
            <meshStandardMaterial color="#3a3832" roughness={0.65} metalness={0.7} />
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
          color="#8a8070"
          roughness={0.82}
          metalness={0.25}
          envMapIntensity={0.55}
        />
      </mesh>
      <mesh position={[0, box.h + 0.35, 0]}>
        <boxGeometry args={[box.w * 1.08, 0.35, box.d * 1.08]} />
        <meshStandardMaterial color="#3d3a35" roughness={0.6} metalness={0.65} />
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
        <Catwalk key={p.id} platform={p} groundY={getHeight(p.x, p.z)} />
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
      <fog attach="fog" args={['#8a8070', 120, 420]} />
      <ambientLight intensity={0.28} color="#e8dcc4" />
      <directionalLight
        position={[70, 95, 35]}
        intensity={1.25}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-far={160}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0003}
      />
      <hemisphereLight args={['#d8cbb0', '#3a3530', 0.4]} />
      <Suspense fallback={null}>
        {/* 1k HDR — same look, ~15× lighter than the 4k EXR */}
        <Environment
          files="/env/tankfarm_1k.hdr"
          background
          backgroundBlurriness={0.1}
          backgroundIntensity={0.95}
          environmentIntensity={1.15}
        />
      </Suspense>
      <Suspense fallback={null}>
        <WalkableYard getHeight={config.getHeight} />
      </Suspense>
    </>
  )
}
