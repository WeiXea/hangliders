import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createLoftBody,
  getCarPaintTexture,
  getTireTexture,
  usePaintSkinMaps,
} from './vehicleSurfaces'

export type VehicleKind = 'car' | 'bus' | 'police' | 'fire' | 'taxi'

function Wheel({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const tire = useMemo(() => getTireTexture(), [])
  return (
    <group position={[x, 0.34 * scale, z]} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.28, 18]} />
        <meshStandardMaterial map={tire} color="#1a1a1a" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.17, 0.17, 0.3, 14]} />
        <meshPhysicalMaterial color="#c5ccd3" metalness={0.85} roughness={0.22} clearcoat={0.55} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.32, 8]} />
        <meshPhysicalMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Mirror({ x }: { x: number }) {
  return (
    <group position={[x, 1.05, 0.55]}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.12, 0.18]} />
        <meshPhysicalMaterial color="#1a1a1a" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[x > 0 ? 0.04 : -0.04, 0, 0]}>
        <boxGeometry args={[0.02, 0.1, 0.14]} />
        <meshPhysicalMaterial color="#90e0ef" metalness={0.3} roughness={0.1} clearcoat={0.8} />
      </mesh>
    </group>
  )
}

function SedanBody({
  color,
  stripe = null,
}: {
  color: string
  stripe?: 'taxi' | 'police' | null
}) {
  const paint = useMemo(() => getCarPaintTexture(color, stripe), [color, stripe])
  const skin = usePaintSkinMaps(1.5)
  const normalScale = useMemo(() => new THREE.Vector2(0.4, 0.4), [])

  const body = useMemo(
    () =>
      createLoftBody(
        [
          { z: 1.95, rx: 0.55, ry: 0.22 },
          { z: 1.55, rx: 0.78, ry: 0.32 },
          { z: 0.9, rx: 0.85, ry: 0.38 },
          { z: 0.2, rx: 0.88, ry: 0.4 },
          { z: -0.6, rx: 0.86, ry: 0.38 },
          { z: -1.3, rx: 0.8, ry: 0.35 },
          { z: -1.85, rx: 0.65, ry: 0.28 },
        ],
        18,
      ),
    [],
  )

  const cabin = useMemo(
    () =>
      createLoftBody(
        [
          { z: 0.75, rx: 0.72, ry: 0.28 },
          { z: 0.2, rx: 0.78, ry: 0.42 },
          { z: -0.5, rx: 0.76, ry: 0.4 },
          { z: -1.05, rx: 0.65, ry: 0.28 },
        ],
        16,
      ),
    [],
  )

  const paintMat = {
    map: paint,
    normalMap: skin.normalMap,
    normalScale,
    roughnessMap: skin.roughnessMap,
    roughness: 0.32,
    metalness: 0.45,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
  } as const

  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow position={[0, 0.48, 0]}>
        <meshPhysicalMaterial {...paintMat} />
      </mesh>
      {/* Cabin shell */}
      <mesh geometry={cabin} castShadow position={[0, 0.95, -0.05]}>
        <meshPhysicalMaterial color="#1c1c1c" roughness={0.4} metalness={0.25} clearcoat={0.3} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.12, 0.55]} rotation={[0.42, 0, 0]} castShadow>
        <planeGeometry args={[1.4, 0.58]} />
        <meshPhysicalMaterial
          color="#a8dadc"
          transmission={0.55}
          thickness={0.2}
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      {/* Rear glass */}
      <mesh position={[0, 1.1, -0.95]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[1.35, 0.5]} />
        <meshPhysicalMaterial
          color="#a8dadc"
          transmission={0.5}
          thickness={0.2}
          roughness={0.06}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Side glass */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * 0.82, 1.08, -0.15]} rotation={[0, s * 0.08, 0]}>
          <planeGeometry args={[0.04, 0.42]} />
          <meshPhysicalMaterial
            color="#a8dadc"
            transparent
            opacity={0.45}
            roughness={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Bumpers */}
      <mesh castShadow position={[0, 0.38, 2.05]}>
        <boxGeometry args={[1.65, 0.22, 0.18]} />
        <meshPhysicalMaterial color="#2b2d30" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.38, -2.0]}>
        <boxGeometry args={[1.65, 0.22, 0.18]} />
        <meshPhysicalMaterial color="#2b2d30" metalness={0.5} roughness={0.4} />
      </mesh>
      <Mirror x={-0.92} />
      <Mirror x={0.92} />
      {/* Lights */}
      {([-0.52, 0.52] as const).map((x) => (
        <mesh key={`h${x}`} position={[x, 0.52, 2.0]} castShadow>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial color="#fff8e7" emissive="#fff3bf" emissiveIntensity={0.95} />
        </mesh>
      ))}
      {([-0.52, 0.52] as const).map((x) => (
        <mesh key={`t${x}`} position={[x, 0.52, -2.0]}>
          <boxGeometry args={[0.22, 0.1, 0.06]} />
          <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={0.65} />
        </mesh>
      ))}
      {/* Grille */}
      <mesh position={[0, 0.5, 2.08]}>
        <boxGeometry args={[0.7, 0.14, 0.04]} />
        <meshPhysicalMaterial color="#111" metalness={0.7} roughness={0.35} />
      </mesh>
      <Wheel x={-0.78} z={1.15} />
      <Wheel x={0.78} z={1.15} />
      <Wheel x={-0.78} z={-1.25} />
      <Wheel x={0.78} z={-1.25} />
    </group>
  )
}

export function VehicleMesh({ kind, color }: { kind: VehicleKind; color?: string }) {
  const blink = useRef<THREE.MeshStandardMaterial>(null)
  const busPaint = useMemo(() => getCarPaintTexture('#e9c46a'), [])
  const firePaint = useMemo(() => getCarPaintTexture('#d62828'), [])
  const skin = usePaintSkinMaps(1.2)
  const normalScale = useMemo(() => new THREE.Vector2(0.35, 0.35), [])

  useFrame((state) => {
    if (!blink.current) return
    const on = Math.floor(state.clock.elapsedTime * 4) % 2 === 0
    blink.current.emissiveIntensity = on ? 1.4 : 0.15
  })

  if (kind === 'bus') {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
          <boxGeometry args={[2.25, 2.05, 7.9]} />
          <meshPhysicalMaterial
            map={busPaint}
            normalMap={skin.normalMap}
            normalScale={normalScale}
            roughnessMap={skin.roughnessMap}
            roughness={0.4}
            metalness={0.28}
            clearcoat={0.45}
            clearcoatRoughness={0.3}
          />
        </mesh>
        {/* Roof curve suggestion */}
        <mesh castShadow position={[0, 2.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[1.05, 6.4, 6, 16]} />
          <meshPhysicalMaterial
            map={busPaint}
            roughness={0.42}
            metalness={0.25}
            clearcoat={0.4}
          />
        </mesh>
        {/* Windshield */}
        <mesh position={[0, 1.7, 3.95]} rotation={[0.08, 0, 0]}>
          <planeGeometry args={[2.0, 1.35]} />
          <meshPhysicalMaterial
            color="#90e0ef"
            transmission={0.5}
            transparent
            opacity={0.65}
            roughness={0.05}
            side={THREE.DoubleSide}
            clearcoat={0.9}
          />
        </mesh>
        {/* Side windows */}
        {[-2.6, -1.1, 0.4, 1.9].map((z) => (
          <group key={z}>
            <mesh position={[1.14, 1.75, z]}>
              <planeGeometry args={[0.04, 0.85]} />
              <meshPhysicalMaterial
                color="#90e0ef"
                transparent
                opacity={0.5}
                roughness={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[-1.14, 1.75, z]}>
              <planeGeometry args={[0.04, 0.85]} />
              <meshPhysicalMaterial
                color="#90e0ef"
                transparent
                opacity={0.5}
                roughness={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
        {/* Door seam */}
        <mesh position={[1.14, 1.2, 2.8]}>
          <boxGeometry args={[0.03, 1.6, 1.1]} />
          <meshStandardMaterial color="#c9a227" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.45, 4.05]}>
          <boxGeometry args={[2.1, 0.25, 0.15]} />
          <meshPhysicalMaterial color="#2b2d30" metalness={0.5} roughness={0.4} />
        </mesh>
        {([-0.7, 0.7] as const).map((x) => (
          <mesh key={x} position={[x, 0.7, 4.05]}>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.8} />
          </mesh>
        ))}
        {[-2.9, -0.7, 1.5, 3.0].map((z) => (
          <Wheel key={z} x={-1.05} z={z} scale={1.15} />
        ))}
        {[-2.9, -0.7, 1.5, 3.0].map((z) => (
          <Wheel key={`r${z}`} x={1.05} z={z} scale={1.15} />
        ))}
      </group>
    )
  }

  if (kind === 'police') {
    return (
      <group>
        <SedanBody color="#f8f9fa" stripe="police" />
        <mesh position={[0, 1.55, 0.05]} castShadow>
          <boxGeometry args={[0.9, 0.16, 1.35]} />
          <meshPhysicalMaterial color="#212529" metalness={0.4} roughness={0.45} />
        </mesh>
        <mesh position={[-0.22, 1.62, 0.15]}>
          <boxGeometry args={[0.35, 0.12, 0.45]} />
          <meshStandardMaterial
            ref={blink}
            color="#e63946"
            emissive="#e63946"
            emissiveIntensity={1}
          />
        </mesh>
        <mesh position={[0.22, 1.62, -0.15]}>
          <boxGeometry args={[0.35, 0.12, 0.45]} />
          <meshStandardMaterial color="#457b9d" emissive="#457b9d" emissiveIntensity={0.9} />
        </mesh>
      </group>
    )
  }

  if (kind === 'fire') {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, 0.95, -0.15]}>
          <boxGeometry args={[2.3, 1.4, 6.5]} />
          <meshPhysicalMaterial
            map={firePaint}
            normalMap={skin.normalMap}
            normalScale={normalScale}
            roughnessMap={skin.roughnessMap}
            roughness={0.38}
            metalness={0.35}
            clearcoat={0.5}
            clearcoatRoughness={0.25}
          />
        </mesh>
        <mesh castShadow position={[0, 1.6, 2.4]}>
          <boxGeometry args={[2.2, 1.2, 1.75]} />
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.45} metalness={0.3} clearcoat={0.2} />
        </mesh>
        <mesh position={[0, 1.7, 2.65]}>
          <planeGeometry args={[1.95, 0.85]} />
          <meshPhysicalMaterial
            color="#90e0ef"
            transmission={0.45}
            transparent
            opacity={0.6}
            roughness={0.06}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Ladder */}
        <mesh position={[0, 2.45, -1.35]} castShadow>
          <boxGeometry args={[0.18, 2.1, 0.18]} />
          <meshPhysicalMaterial color="#ced4da" metalness={0.8} roughness={0.22} clearcoat={0.4} />
        </mesh>
        <mesh position={[0.55, 2.15, -0.35]} rotation={[0, 0, 0.12]} castShadow>
          <boxGeometry args={[0.1, 0.1, 3.3]} />
          <meshPhysicalMaterial color="#adb5bd" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.55, -3.35]}>
          <boxGeometry args={[2.05, 0.7, 0.5]} />
          <meshPhysicalMaterial color="#212529" metalness={0.4} roughness={0.5} />
        </mesh>
        {([-0.7, 0.7] as const).map((x) => (
          <mesh key={x} position={[x, 0.65, 3.15]}>
            <sphereGeometry args={[0.13, 10, 10]} />
            <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.85} />
          </mesh>
        ))}
        {[-2.2, -0.4, 1.4, 2.6].map((z) => (
          <Wheel key={z} x={-1.05} z={z} />
        ))}
        {[-2.2, -0.4, 1.4, 2.6].map((z) => (
          <Wheel key={`r${z}`} x={1.05} z={z} />
        ))}
      </group>
    )
  }

  if (kind === 'taxi') {
    return (
      <group>
        <SedanBody color="#ffd60a" stripe="taxi" />
        <mesh position={[0, 1.52, -0.1]} castShadow>
          <boxGeometry args={[0.72, 0.18, 1.05]} />
          <meshPhysicalMaterial color="#212529" metalness={0.35} roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.6, -0.1]}>
          <boxGeometry args={[0.55, 0.08, 0.8]} />
          <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.4} />
        </mesh>
      </group>
    )
  }

  return <SedanBody color={color && color.startsWith('#') ? color : '#457b9d'} />
}
