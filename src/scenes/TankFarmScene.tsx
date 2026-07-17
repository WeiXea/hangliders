import { Suspense, useMemo } from 'react'
import { Environment, Text } from '@react-three/drei'
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
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        normalScale={maps.normalScale}
        color="#6a6458"
        roughness={0.92}
        metalness={0.08}
        envMapIntensity={0.55}
      />
    </mesh>
  )
}

function YardRoads({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const roads: [number, number, number, number, number][] = [
    [32, 58, 40, 10, 0],
    [32, 80, 90, 9, 0],
    [32, 100, 80, 9, 0],
    [20, 80, 9, 70, 0],
    [48, 80, 9, 70, 0],
  ]
  return (
    <group>
      {roads.map(([x, z, w, d, yaw], i) => (
        <mesh
          key={i}
          receiveShadow
          position={[x, getHeight(x, z) + 0.06, z]}
          rotation={[-Math.PI / 2, 0, yaw]}
        >
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#2a2926" roughness={0.97} metalness={0.03} />
        </mesh>
      ))}
      {/* Bright spawn pad so you know you are in the 3D yard */}
      <mesh
        receiveShadow
        position={[32, getHeight(32, 58) + 0.08, 58]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[6, 28]} />
        <meshStandardMaterial color="#c9a227" roughness={0.7} metalness={0.15} />
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
      <mesh castShadow receiveShadow position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[r, r * 1.02, h, 28]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.48} envMapIntensity={1.2} />
      </mesh>
      <mesh castShadow position={[0, h + 0.12, 0]}>
        <torusGeometry args={[r * 0.9, 0.22, 6, 28]} />
        <meshStandardMaterial color="#3a3832" roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[0, h, 0]}>
        <sphereGeometry args={[r * 0.92, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.45} />
      </mesh>
      <mesh castShadow position={[0, h + r * 0.32, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 1.6, 8]} />
        <meshStandardMaterial color="#2e2c28" roughness={0.55} metalness={0.6} />
      </mesh>
      <mesh castShadow position={[r + 0.2, h * 0.48, 0]}>
        <boxGeometry args={[0.18, h * 0.92, 0.7]} />
        <meshStandardMaterial color="#1a1816" roughness={0.65} metalness={0.45} />
      </mesh>
      <mesh receiveShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[r * 1.1, r * 1.15, 0.6, 24]} />
        <meshStandardMaterial color="#3f3d38" roughness={0.9} metalness={0.12} />
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
      <meshStandardMaterial color="#4a4842" roughness={0.5} metalness={0.6} envMapIntensity={1} />
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
        <boxGeometry args={[platform.w, 0.25, platform.d]} />
        <meshStandardMaterial color="#3a3834" roughness={0.7} metalness={0.4} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} castShadow position={[0, y + 0.95, s * (platform.d * 0.5 - 0.12)]}>
          <boxGeometry args={[platform.w, 0.1, 0.1]} />
          <meshStandardMaterial color="#e9c46a" roughness={0.4} metalness={0.45} />
        </mesh>
      ))}
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            castShadow
            position={[sx * platform.w * 0.4, y * 0.5, sz * platform.d * 0.35]}
          >
            <boxGeometry args={[0.22, y, 0.22]} />
            <meshStandardMaterial color="#2e2c28" roughness={0.65} metalness={0.45} />
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
      <mesh castShadow receiveShadow position={[0, box.h * 0.5, 0]}>
        <boxGeometry args={[box.w, box.h, box.d]} />
        <meshStandardMaterial color="#6b6358" roughness={0.82} metalness={0.12} />
      </mesh>
      <mesh castShadow position={[0, box.h + 0.4, 0]}>
        <boxGeometry args={[box.w * 1.08, 0.4, box.d * 1.08]} />
        <meshStandardMaterial color="#3d3a35" roughness={0.7} metalness={0.25} />
      </mesh>
    </group>
  )
}

function FarmYard({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const gy = getHeight(32, 58)
  return (
    <group>
      <YardRoads getHeight={getHeight} />
      {/* Floating label at spawn — proves you are in the 3D scene */}
      <Text
        position={[32, gy + 3.2, 58]}
        fontSize={1.1}
        color="#ffd60a"
        anchorX="center"
        outlineWidth={0.04}
        outlineColor="#000"
      >
        TANK YARD — WALK HERE
      </Text>
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
      <PipeRun x0={32} z0={88} x1={55} z1={95} y={getHeight(43, 91) + 2.8} r={0.6} />
      <PipeRun x0={18} z0={70} x1={10} z1={95} y={getHeight(14, 82) + 2.0} r={0.4} />
      {/* Orange barrels at your feet */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`barrel-${i}`}
          castShadow
          position={[28 + i * 1.4, gy + 0.55, 54]}
        >
          <cylinderGeometry args={[0.4, 0.42, 1.1, 12]} />
          <meshStandardMaterial color="#e76f51" roughness={0.55} metalness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

export function TankFarmScene({ config }: { config: BiomeConfig }) {
  return (
    <>
      {/* Solid sky color — HDRI is reflections only, so 3D tanks dominate */}
      <color attach="background" args={['#6b6558']} />
      <fog attach="fog" args={['#6b6558', 50, 220]} />
      <Suspense fallback={null}>
        <Environment
          files="/env/tankfarm_4k.exr"
          background={false}
          environmentIntensity={1.15}
        />
      </Suspense>
      <ambientLight intensity={0.35} color="#e8dcc4" />
      <directionalLight
        position={[60, 90, 40]}
        intensity={2.1}
        color="#fff4d8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0002}
      />
      <hemisphereLight args={['#d4c8a8', '#3a3830', 0.55]} />
      <Suspense fallback={null}>
        <IndustrialGround getHeight={config.getHeight} />
      </Suspense>
      <FarmYard getHeight={config.getHeight} />
    </>
  )
}
