import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  CITY_GARAGES,
  SECRET_PASSAGES,
  TUNNEL_SEGMENTS,
  secretDoorWorldPos,
} from '../game/cityUnderground'
import { getBuildingById } from '../game/cityBuildings'

function PulseBeacon({ color, height = 8 }: { color: string; height?: number }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.emissiveIntensity = 0.45 + Math.sin(state.clock.elapsedTime * 3) * 0.35
    }
  })
  return (
    <group>
      <mesh position={[0, height * 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, height, 8]} />
        <meshStandardMaterial color="#212529" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <pointLight position={[0, height, 0]} intensity={1.2} color={color} distance={14} />
    </group>
  )
}

/** Sunken metro stairwell — impossible to miss at intersections. */
function MetroEntrance({ x, z, y, label }: { x: number; z: number; y: number; label: string }) {
  return (
    <group position={[x, y, z]}>
      <PulseBeacon color="#4cc9f0" height={9} />
      {/* Pit */}
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[5.5, 1.1, 5.5]} />
        <meshStandardMaterial color="#1a1d21" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[4.8, 0.08, 4.8]} />
        <meshStandardMaterial color="#212529" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Stairs hint */}
      {[-1.4, -0.7, 0, 0.7, 1.4].map((ox) => (
        <mesh key={ox} position={[ox, -0.35, 1.6]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.9]} />
          <meshStandardMaterial color="#495057" />
        </mesh>
      ))}
      {/* Railings */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * 2.6, 0.5, 0]}>
          <boxGeometry args={[0.1, 1.2, 5.2]} />
          <meshStandardMaterial color="#74c0fc" metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      <Text position={[0, 3.2, 0]} fontSize={0.55} color="#4cc9f0" anchorX="center" outlineWidth={0.04} outlineColor="#000">
        METRO ↓
      </Text>
      <Text position={[0, 2.5, 0]} fontSize={0.32} color="#e9ecef" anchorX="center" maxWidth={5}>
        {label}
      </Text>
      <Text position={[0, 1.8, 0]} fontSize={0.28} color="#52b788" anchorX="center">
        Press E
      </Text>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[2.2, 2.55, 32]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.45} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function GarageEntrance({
  g,
  y,
}: {
  g: (typeof CITY_GARAGES)[number]
  y: number
}) {
  return (
    <group position={[g.x, y, g.z]} rotation={[0, g.yaw, 0]}>
      <PulseBeacon color="#ffd60a" height={7} />
      {/* Structure */}
      <mesh castShadow position={[0, 2.8, 0]}>
        <boxGeometry args={[g.width, 5.6, g.depth]} />
        <meshStandardMaterial color="#495057" roughness={0.78} metalness={0.2} />
      </mesh>
      {/* Open bay */}
      <mesh position={[0, 1.4, g.depth * 0.5 - 0.1]}>
        <boxGeometry args={[g.width * 0.82, 2.8, 0.25]} />
        <meshStandardMaterial color="#111" roughness={0.95} />
      </mesh>
      {/* Yellow/black stripe arch */}
      <mesh position={[0, 2.9, g.depth * 0.5 + 0.2]}>
        <boxGeometry args={[g.width * 0.9, 0.5, 0.35]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.25} />
      </mesh>
      <Text position={[0, 4.2, g.depth * 0.5 + 0.5]} fontSize={0.5} color="#ffd60a" anchorX="center" outlineWidth={0.035} outlineColor="#000">
        {g.label.toUpperCase()}
      </Text>
      <Text position={[0, 3.5, g.depth * 0.5 + 0.5]} fontSize={0.3} color="#52b788" anchorX="center">
        Press E to enter
      </Text>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[Math.sin(g.yaw) * (g.depth * 0.5 + 1.8), 0.08, Math.cos(g.yaw) * (g.depth * 0.5 + 1.8)]}>
        <ringGeometry args={[1.8, 2.1, 32]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 3, g.depth * 0.3]} intensity={1.4} color="#fff3bf" distance={12} />
    </group>
  )
}

function SecretDoorMarker({
  door,
  shopLabel,
}: {
  door: { x: number; y: number; z: number }
  shopLabel: string
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((state) => {
    if (mat.current) {
      mat.current.emissiveIntensity = 0.35 + Math.sin(state.clock.elapsedTime * 2.5) * 0.25
    }
  })
  return (
    <group position={[door.x, door.y, door.z]}>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[1.4, 2.5, 0.18]} />
        <meshStandardMaterial ref={mat} color="#7209b7" emissive="#b5179e" emissiveIntensity={0.4} roughness={0.45} />
      </mesh>
      <Text position={[0, 2.8, 0.2]} fontSize={0.38} color="#f72585" anchorX="center" outlineWidth={0.03} outlineColor="#000">
        SECRET
      </Text>
      <Text position={[0, 2.2, 0.2]} fontSize={0.26} color="#e9ecef" anchorX="center" maxWidth={3}>
        {shopLabel}
      </Text>
      <Text position={[0, 1.7, 0.2]} fontSize={0.24} color="#52b788" anchorX="center">
        Press E
      </Text>
    </group>
  )
}

/** Welcome sign near city spawn pointing downtown. */
function DowntownGuideSign({ y }: { y: number }) {
  return (
    <group position={[-28, y, -8]}>
      <mesh castShadow position={[0, 2.5, 0]}>
        <boxGeometry args={[0.15, 5, 0.15]} />
        <meshStandardMaterial color="#495057" />
      </mesh>
      <mesh castShadow position={[0, 4.2, 0]}>
        <boxGeometry args={[5.5, 2.2, 0.12]} />
        <meshStandardMaterial color="#212529" roughness={0.55} />
      </mesh>
      <Text position={[0, 4.5, 0.08]} fontSize={0.32} color="#ffd60a" anchorX="center" maxWidth={5}>
        DOWNTOWN GUIDE
      </Text>
      <Text position={[0, 3.85, 0.08]} fontSize={0.22} color="#e9ecef" anchorX="center" maxWidth={5.2}>
        Metro 44,44 · Garage 22,22 · Shops = green mat E
      </Text>
      <Text position={[0, 3.35, 0.08]} fontSize={0.2} color="#4cc9f0" anchorX="center" maxWidth={5.2}>
        Purple doors = secret tunnels
      </Text>
    </group>
  )
}

export function CityFeatureMarkers({
  getHeight,
}: {
  getHeight: (x: number, z: number) => number
}) {
  const metroIds = new Set<number>()
  const metros = TUNNEL_SEGMENTS.filter((s) => {
    if (!s.surfaceExit || metroIds.has(s.id)) return false
    metroIds.add(s.id)
    return true
  })

  return (
    <>
      <DowntownGuideSign y={getHeight(-28, -8) + 0.12} />
      {metros.map((seg) => (
        <MetroEntrance
          key={`metro-${seg.id}`}
          x={seg.x}
          z={seg.z}
          y={getHeight(seg.x, seg.z) + 0.12}
          label={seg.label ?? 'Metro'}
        />
      ))}
      {CITY_GARAGES.map((g) => (
        <GarageEntrance key={g.id} g={g} y={getHeight(g.x, g.z) + 0.12} />
      ))}
      {SECRET_PASSAGES.map((p) => {
        const door = secretDoorWorldPos(p, getHeight)
        const b = getBuildingById(p.buildingId)
        const shopLabel = b?.shop ? `${b.shop} alley` : 'Alley door'
        return (
          <SecretDoorMarker
            key={p.id}
            door={door}
            shopLabel={shopLabel}
          />
        )
      })}
    </>
  )
}
