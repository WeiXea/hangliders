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

function IndustrialGround({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const maps = useGroundMaps('tankfarm')
  const geometry = useMemo(() => {
    const size = 400
    const segments = 48
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
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        normalScale={maps.normalScale}
        color="#7a7468"
        roughness={0.92}
        metalness={0.08}
        envMapIntensity={0.4}
      />
    </mesh>
  )
}

function YardRoads({ getHeight }: { getHeight: (x: number, z: number) => number }) {
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
          position={[x, getHeight(x, z) + 0.08, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#1a1916" />
        </mesh>
      ))}
      {/* Bright spawn disc — always visible, ignores lighting */}
      <mesh position={[32, getHeight(32, 58) + 0.12, 58]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7, 32]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
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
      {/* Unlit shell so tanks stay visible even if env/lights fail */}
      <mesh position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[r, r * 1.02, h, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <cylinderGeometry args={[r * 0.95, r * 0.95, 0.35, 24]} />
        <meshBasicMaterial color="#2a2824" />
      </mesh>
      <mesh position={[0, h + 0.5, 0]}>
        <sphereGeometry args={[r * 0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[r + 0.15, h * 0.45, 0]}>
        <boxGeometry args={[0.25, h * 0.85, 0.9]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[r * 1.12, r * 1.18, 0.5, 20]} />
        <meshBasicMaterial color="#3a3832" />
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
  r = 0.55,
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
    <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[0, yaw, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshBasicMaterial color="#554f45" />
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
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[platform.w, 0.28, platform.d]} />
        <meshBasicMaterial color="#3a3834" />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[0, y + 1, s * (platform.d * 0.5 - 0.12)]}>
          <boxGeometry args={[platform.w, 0.12, 0.12]} />
          <meshBasicMaterial color="#ffd60a" />
        </mesh>
      ))}
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            position={[sx * platform.w * 0.4, y * 0.5, sz * platform.d * 0.35]}
          >
            <boxGeometry args={[0.25, y, 0.25]} />
            <meshBasicMaterial color="#222" />
          </mesh>
        )),
      )}
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
      <mesh position={[0, box.h * 0.5, 0]}>
        <boxGeometry args={[box.w, box.h, box.d]} />
        <meshBasicMaterial color="#8a7f6e" />
      </mesh>
      <mesh position={[0, box.h + 0.35, 0]}>
        <boxGeometry args={[box.w * 1.08, 0.4, box.d * 1.08]} />
        <meshBasicMaterial color="#3d3a35" />
      </mesh>
    </group>
  )
}

/** Billboard blocks spelling YARD — no font loader / Suspense. */
function YardSign({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[10, 2.4, 0.35]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[0, 2.2, 0.2]}>
        <boxGeometry args={[9.2, 1.8, 0.2]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.45, 1.8, 0.45]} />
        <meshBasicMaterial color="#333" />
      </mesh>
    </group>
  )
}

function FarmYard({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const gy = getHeight(32, 58)
  return (
    <group>
      <YardRoads getHeight={getHeight} />
      <YardSign x={32} y={gy} z={64} />
      {FARM_TANKS.map((t) => (
        <StorageTank key={t.id} tank={t} groundY={getHeight(t.x, t.z)} />
      ))}
      {FARM_PLATFORMS.map((p) => (
        <Catwalk key={p.id} platform={p} groundY={getHeight(p.x, p.z)} />
      ))}
      {FARM_BOXES.map((b) => (
        <Shed key={b.id} box={b} groundY={getHeight(b.x, b.z)} />
      ))}
      <PipeRun x0={18} z0={70} x1={48} z1={68} y={getHeight(33, 69) + 2.4} />
      <PipeRun x0={48} z0={68} x1={32} z1={88} y={getHeight(40, 78) + 2.6} />
      <PipeRun x0={32} z0={88} x1={10} z1={95} y={getHeight(21, 91) + 2.3} />
      <PipeRun x0={32} z0={88} x1={55} z1={95} y={getHeight(43, 91) + 2.8} r={0.65} />
      {/* Safety cones / barrels at feet */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={`barrel-${i}`} position={[27 + i * 1.5, gy + 0.6, 52]}>
          <cylinderGeometry args={[0.45, 0.48, 1.2, 10]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#ff5a1f' : '#ffffff'} />
        </mesh>
      ))}
      {/* Giant beacon tank dead ahead of spawn — cannot miss */}
      <mesh position={[32, gy + 12, 72]}>
        <cylinderGeometry args={[5, 5.2, 24, 28]} />
        <meshBasicMaterial color="#e8e0d0" />
      </mesh>
      <mesh position={[32, gy + 24.5, 72]}>
        <cylinderGeometry args={[4.6, 4.6, 1, 28]} />
        <meshBasicMaterial color="#c0392b" />
      </mesh>
    </group>
  )
}

export function TankFarmScene({ config }: { config: BiomeConfig }) {
  return (
    <>
      <color attach="background" args={['#8a8478']} />
      <fog attach="fog" args={['#8a8478', 80, 380]} />
      <ambientLight intensity={0.85} color="#fff2d8" />
      <directionalLight position={[40, 80, 20]} intensity={1.6} color="#fff8e8" />
      <hemisphereLight args={['#e8dfc8', '#4a453c', 0.7]} />
      <Suspense fallback={null}>
        <Environment
          files="/env/tankfarm_4k.exr"
          background={false}
          environmentIntensity={0.9}
        />
      </Suspense>
      <Suspense fallback={null}>
        <IndustrialGround getHeight={config.getHeight} />
      </Suspense>
      {/* No Suspense / Text here — yard must mount even if HDRI is slow */}
      <FarmYard getHeight={config.getHeight} />
    </>
  )
}
