import { Suspense, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { BiomeConfig } from '../types/game'
import { useGroundMaps } from '../game/pbrMaps'
import {
  FARM_BOXES,
  FARM_PLATFORMS,
  FARM_TANKS,
} from '../game/tankfarmWorld'

/**
 * Step 2 — Walkable Tank Farm yard.
 * HDRI is lighting/sky only; real tanks, roads, and catwalks are the place you walk.
 */
function IndustrialGround({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const maps = useGroundMaps('tankfarm')
  const geometry = useMemo(() => {
    const size = 520
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
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        normalScale={maps.normalScale}
        color="#5a564e"
        roughness={0.92}
        metalness={0.1}
        envMapIntensity={0.7}
      />
    </mesh>
  )
}

function YardRoads({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const roads: [number, number, number, number, number][] = [
    // x, z, w, d, yaw
    [35, 55, 120, 9, 0.05],
    [35, 90, 100, 8, 0],
    [35, 125, 110, 8, -0.04],
    [20, 85, 8, 90, 0],
    [55, 90, 8, 95, 0.02],
    [85, 95, 8, 80, 0],
  ]
  return (
    <group>
      {roads.map(([x, z, w, d, yaw], i) => (
        <mesh
          key={i}
          receiveShadow
          position={[x, getHeight(x, z) + 0.05, z]}
          rotation={[-Math.PI / 2, 0, yaw]}
        >
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#2f2e2b" roughness={0.96} metalness={0.04} />
        </mesh>
      ))}
    </group>
  )
}

function StorageTank({
  tank,
  groundY,
}: {
  tank: (typeof FARM_TANKS)[number]
  groundY: number
}) {
  const { radius: r, height: h, color } = tank
  return (
    <group position={[tank.x, groundY, tank.z]}>
      <mesh castShadow receiveShadow position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[r, r * 1.015, h, 28]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.42} envMapIntensity={1.1} />
      </mesh>
      {/* Rim */}
      <mesh castShadow position={[0, h + 0.15, 0]}>
        <torusGeometry args={[r * 0.92, 0.18, 6, 28]} />
        <meshStandardMaterial color="#4a4740" roughness={0.65} metalness={0.5} />
      </mesh>
      {/* Roof dome */}
      <mesh castShadow position={[0, h + 0.05, 0]}>
        <sphereGeometry args={[r * 0.95, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Vent */}
      <mesh castShadow position={[0, h + r * 0.35, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 1.4, 8]} />
        <meshStandardMaterial color="#3d3a35" roughness={0.6} metalness={0.55} />
      </mesh>
      {/* Ladder */}
      <mesh castShadow position={[r + 0.15, h * 0.45, 0]}>
        <boxGeometry args={[0.12, h * 0.9, 0.55]} />
        <meshStandardMaterial color="#2a2824" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Base skirt */}
      <mesh receiveShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[r * 1.08, r * 1.12, 0.5, 24]} />
        <meshStandardMaterial color="#3f3d38" roughness={0.9} metalness={0.15} />
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
  r = 0.45,
}: {
  x0: number
  z0: number
  x1: number
  z1: number
  y: number
  r?: number
}) {
  const dx = x1 - x0
  const dz = z1 - z0
  const len = Math.hypot(dx, dz)
  const yaw = Math.atan2(dx, dz)
  return (
    <mesh castShadow position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[0, yaw, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial color="#4a4842" roughness={0.55} metalness={0.55} envMapIntensity={0.9} />
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
        <meshStandardMaterial color="#3a3834" roughness={0.75} metalness={0.35} />
      </mesh>
      {/* Rails */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} castShadow position={[0, y + 0.9, s * (platform.d * 0.5 - 0.1)]}>
          <boxGeometry args={[platform.w, 0.08, 0.08]} />
          <meshStandardMaterial color="#c9a227" roughness={0.45} metalness={0.4} />
        </mesh>
      ))}
      {/* Legs */}
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            castShadow
            position={[sx * platform.w * 0.4, y * 0.5, sz * platform.d * 0.35]}
          >
            <boxGeometry args={[0.2, y, 0.2]} />
            <meshStandardMaterial color="#2e2c28" roughness={0.7} metalness={0.4} />
          </mesh>
        )),
      )}
      {/* Stairs down toward spawn */}
      <mesh
        castShadow
        receiveShadow
        position={[0, y * 0.5, -platform.d * 0.5 - 2.2]}
        rotation={[0.55, 0, 0]}
      >
        <boxGeometry args={[2.2, 0.15, y * 1.15]} />
        <meshStandardMaterial color="#3a3834" roughness={0.8} metalness={0.3} />
      </mesh>
    </group>
  )
}

function Shed({
  box,
  groundY,
}: {
  box: (typeof FARM_BOXES)[number]
  groundY: number
}) {
  return (
    <group position={[box.x, groundY, box.z]}>
      <mesh castShadow receiveShadow position={[0, box.h * 0.5, 0]}>
        <boxGeometry args={[box.w, box.h, box.d]} />
        <meshStandardMaterial color="#5c5850" roughness={0.85} metalness={0.12} />
      </mesh>
      <mesh castShadow position={[0, box.h + 0.35, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[box.w * 1.05, 0.35, box.d * 1.05]} />
        <meshStandardMaterial color="#3d3a35" roughness={0.75} metalness={0.2} />
      </mesh>
    </group>
  )
}

function FarmYard({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  return (
    <group>
      <YardRoads getHeight={getHeight} />
      {FARM_TANKS.map((t) => (
        <StorageTank key={t.id} tank={t} groundY={getHeight(t.x, t.z)} />
      ))}
      {FARM_PLATFORMS.map((p) => (
        <Catwalk key={p.id} platform={p} groundY={getHeight(p.x, p.z)} />
      ))}
      {FARM_BOXES.map((b) => (
        <Shed key={b.id} box={b} groundY={getHeight(b.x, b.z)} />
      ))}
      {/* Pipe network between tanks */}
      <PipeRun x0={18} z0={72} x1={42} z1={68} y={getHeight(30, 70) + 2.2} />
      <PipeRun x0={42} z0={68} x1={64} z1={88} y={getHeight(50, 78) + 2.4} />
      <PipeRun x0={28} z0={100} x1={52} z1={110} y={getHeight(40, 105) + 2.1} />
      <PipeRun x0={52} z0={110} x1={75} z1={135} y={getHeight(60, 120) + 2.5} />
      <PipeRun x0={64} z0={88} x1={80} z1={70} y={getHeight(72, 79) + 3.0} r={0.55} />
      <PipeRun x0={18} z0={72} x1={28} z1={100} y={getHeight(22, 86) + 1.8} r={0.35} />
      {/* Fence line */}
      {Array.from({ length: 24 }, (_, i) => {
        const x = -40 + i * 7
        const z = 40
        return (
          <mesh key={`f-${i}`} castShadow position={[x, getHeight(x, z) + 1.1, z]}>
            <boxGeometry args={[0.12, 2.2, 0.12]} />
            <meshStandardMaterial color="#2a2824" roughness={0.7} metalness={0.35} />
          </mesh>
        )
      })}
      <mesh position={[40, getHeight(40, 40) + 2.0, 40]}>
        <boxGeometry args={[170, 0.08, 0.08]} />
        <meshStandardMaterial color="#8a8070" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  )
}

export function TankFarmScene({ config }: { config: BiomeConfig }) {
  return (
    <>
      <color attach="background" args={['#4a453c']} />
      <fog attach="fog" args={[config.fogColor, 40, 280]} />
      {/* HDRI = lighting + distant sky. Blur so 3D yard is what you walk in. */}
      <Suspense fallback={null}>
        <Environment
          files="/env/tankfarm_4k.exr"
          background
          backgroundBlurriness={0.45}
          backgroundIntensity={0.85}
          environmentIntensity={0.95}
        />
      </Suspense>
      <ambientLight intensity={0.22} color="#d4c8b0" />
      <directionalLight
        position={config.sunPosition}
        intensity={1.7}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={280}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0002}
      />
      <hemisphereLight args={['#c9b896', '#3a3832', 0.45]} />
      <Suspense fallback={null}>
        <IndustrialGround getHeight={config.getHeight} />
      </Suspense>
      <FarmYard getHeight={config.getHeight} />
    </>
  )
}
