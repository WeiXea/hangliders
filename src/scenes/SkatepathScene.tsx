import { Suspense, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { BiomeConfig } from '../types/game'
import { useTankfarmSurfaces, type TankfarmSurfaces } from '../game/tankfarmPbr'
import {
  PATH_DECK_Y,
  PATH_HALF_W,
  PATH_Z0,
  PATH_Z1,
  SKATE_BARRIERS,
  SKATE_BOXES,
  SKATE_CONES,
  SKATE_RAILS,
  SKATE_RAMPS,
} from '../game/skatepathWorld'

function DirtGround({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const geometry = useMemo(() => {
    const sizeX = 120
    const sizeZ = 480
    const segments = 48
    const geo = new THREE.PlaneGeometry(sizeX, sizeZ, segments, Math.floor(segments * 1.6))
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i) + 200
      pos.setY(i, getHeight(x, z))
      pos.setZ(i, z)
    }
    geo.computeVertexNormals()
    return geo
  }, [getHeight])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#5a6a48" roughness={0.96} metalness={0.02} />
    </mesh>
  )
}

function SkateDeck({ asphalt }: { asphalt: TankfarmSurfaces['asphalt'] }) {
  const length = PATH_Z1 - PATH_Z0
  const midZ = (PATH_Z0 + PATH_Z1) * 0.5
  const width = PATH_HALF_W * 2

  return (
    <group>
      <mesh
        receiveShadow
        castShadow
        position={[0, PATH_DECK_Y, midZ]}
      >
        <boxGeometry args={[width, 0.35, length]} />
        <meshStandardMaterial
          map={asphalt.map}
          normalMap={asphalt.normalMap}
          roughnessMap={asphalt.roughnessMap}
          normalScale={asphalt.normalScale}
          color="#6e6a62"
          roughness={0.92}
          metalness={0.04}
          envMapIntensity={0.4}
        />
      </mesh>
      {/* Center dashed line */}
      {Array.from({ length: 42 }, (_, i) => {
        const z = PATH_Z0 + 12 + i * 10
        return (
          <mesh key={i} position={[0, PATH_DECK_Y + 0.19, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.22, 3.2]} />
            <meshStandardMaterial color="#e8e0a8" roughness={0.85} metalness={0} />
          </mesh>
        )
      })}
      {/* Edge lines */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          position={[s * (PATH_HALF_W - 0.35), PATH_DECK_Y + 0.19, midZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.18, length - 4]} />
          <meshStandardMaterial color="#f0e8c8" roughness={0.85} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}

function Cone({
  cone,
  groundY,
}: {
  cone: (typeof SKATE_CONES)[number]
  groundY: number
}) {
  return (
    <group position={[cone.x, groundY, cone.z]}>
      <mesh castShadow position={[0, cone.height * 0.45, 0]}>
        <cylinderGeometry args={[0.06, cone.radius, cone.height, 10]} />
        <meshStandardMaterial color="#f06a20" roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh position={[0, cone.height * 0.55, 0]}>
        <cylinderGeometry args={[0.12, 0.22, 0.12, 10]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[cone.radius * 1.15, cone.radius * 1.2, 0.08, 10]} />
        <meshStandardMaterial color="#2a2824" roughness={0.9} metalness={0.1} />
      </mesh>
    </group>
  )
}

function Barrier({
  barrier,
  groundY,
}: {
  barrier: (typeof SKATE_BARRIERS)[number]
  groundY: number
}) {
  return (
    <group position={[barrier.x, groundY, barrier.z]}>
      <mesh castShadow receiveShadow position={[0, barrier.h * 0.5, 0]}>
        <boxGeometry args={[barrier.w, barrier.h, barrier.d]} />
        <meshStandardMaterial color="#d4a018" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, barrier.h * 0.72, 0]}>
        <boxGeometry args={[barrier.w * 0.92, barrier.h * 0.28, barrier.d * 1.05]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  )
}

function GrindRail({
  rail,
  groundY,
}: {
  rail: (typeof SKATE_RAILS)[number]
  groundY: number
}) {
  const y = groundY + rail.height
  return (
    <group position={[rail.x, 0, rail.z]}>
      <mesh castShadow position={[0, y, 0]}>
        <boxGeometry args={[0.22, 0.12, rail.length]} />
        <meshStandardMaterial color="#b8c0c8" roughness={0.35} metalness={0.85} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[0, y * 0.5, s * (rail.length * 0.42)]}>
          <boxGeometry args={[0.14, y, 0.14]} />
          <meshStandardMaterial color="#4a4842" roughness={0.6} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function Funbox({
  ramp,
  groundY,
}: {
  ramp: (typeof SKATE_RAMPS)[number]
  groundY: number
}) {
  const y = groundY + ramp.deckH
  return (
    <group position={[ramp.x, 0, ramp.z]}>
      <mesh castShadow receiveShadow position={[0, y * 0.5, 0]}>
        <boxGeometry args={[ramp.w, y, ramp.d]} />
        <meshStandardMaterial color="#3a3834" roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, y + 0.06, 0]}>
        <boxGeometry args={[ramp.w + 0.1, 0.12, ramp.d + 0.1]} />
        <meshStandardMaterial color="#5a5850" roughness={0.85} metalness={0.08} />
      </mesh>
      {/* Approach wedges (visual) */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          castShadow
          position={[0, y * 0.28, s * (ramp.d * 0.5 + 1.1)]}
          rotation={[s * 0.45, 0, 0]}
        >
          <boxGeometry args={[ramp.w * 0.95, 0.18, 2.4]} />
          <meshStandardMaterial color="#6a665c" roughness={0.8} metalness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

function Crate({
  box,
  groundY,
  surfaces,
}: {
  box: (typeof SKATE_BOXES)[number]
  groundY: number
  surfaces: TankfarmSurfaces
}) {
  return (
    <group position={[box.x, groundY, box.z]}>
      <mesh castShadow receiveShadow position={[0, box.h * 0.5, 0]}>
        <boxGeometry args={[box.w, box.h, box.d]} />
        <meshStandardMaterial
          map={surfaces.rusty.map}
          color="#8a7060"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
    </group>
  )
}

function SideRails({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const posts: number[] = []
  for (let z = 4; z < PATH_Z1 - 8; z += 8) posts.push(z)
  return (
    <group>
      {([-1, 1] as const).flatMap((side) =>
        posts.map((z) => {
          const x = side * (PATH_HALF_W + 0.15)
          const gy = getHeight(x, z)
          return (
            <group key={`${side}-${z}`} position={[x, gy, z]}>
              <mesh castShadow position={[0, 0.55, 0]}>
                <boxGeometry args={[0.1, 1.1, 0.1]} />
                <meshStandardMaterial color="#3a3832" roughness={0.55} metalness={0.7} />
              </mesh>
            </group>
          )
        }),
      )}
      {([-1, 1] as const).map((side) => {
        const x = side * (PATH_HALF_W + 0.15)
        const midZ = (PATH_Z0 + PATH_Z1) * 0.5
        const len = PATH_Z1 - PATH_Z0 - 16
        const gy = getHeight(x, midZ)
        return (
          <mesh key={`rail-${side}`} position={[x, gy + 1.05, midZ]}>
            <boxGeometry args={[0.08, 0.08, len]} />
            <meshStandardMaterial color="#c4a030" roughness={0.45} metalness={0.65} />
          </mesh>
        )
      })}
    </group>
  )
}

function SkateYard({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const surfaces = useTankfarmSurfaces()
  return (
    <group>
      <DirtGround getHeight={getHeight} />
      <SkateDeck asphalt={surfaces.asphalt} />
      <SideRails getHeight={getHeight} />
      {SKATE_CONES.map((c) => (
        <Cone key={c.id} cone={c} groundY={getHeight(c.x, c.z)} />
      ))}
      {SKATE_BARRIERS.map((b) => (
        <Barrier key={b.id} barrier={b} groundY={getHeight(b.x, b.z)} />
      ))}
      {SKATE_RAILS.map((r) => (
        <GrindRail key={r.id} rail={r} groundY={getHeight(r.x, r.z)} />
      ))}
      {SKATE_RAMPS.map((r) => (
        <Funbox key={r.id} ramp={r} groundY={getHeight(r.x, r.z)} />
      ))}
      {SKATE_BOXES.map((b) => (
        <Crate key={b.id} box={b} groundY={getHeight(b.x, b.z)} surfaces={surfaces} />
      ))}
    </group>
  )
}

export function SkatepathScene({ config }: { config: BiomeConfig }) {
  return (
    <>
      <fog attach="fog" args={['#9ab0c4', 100, 520]} />
      <ambientLight intensity={0.32} color="#e8f0ff" />
      <directionalLight
        position={[50, 90, 20]}
        intensity={1.35}
        color="#fff6e0"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-far={220}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0003}
      />
      <hemisphereLight args={['#c8d8f0', '#4a5a40', 0.45]} />
      <Suspense fallback={null}>
        <Environment
          files="/env/city_1k.hdr"
          background
          backgroundBlurriness={0.12}
          backgroundIntensity={0.9}
          environmentIntensity={1.05}
        />
      </Suspense>
      <Suspense fallback={null}>
        <SkateYard getHeight={config.getHeight} />
      </Suspense>
    </>
  )
}
