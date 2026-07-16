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
      ref.current.emissiveIntensity = 0.45 + Math.sin(state.clock.elapsedTime * 2.4) * 0.3
    }
  })
  return (
    <group>
      <mesh position={[0, height * 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.16, height, 8]} />
        <meshStandardMaterial color="#212529" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
      <pointLight position={[0, height, 0]} intensity={1.1} color={color} distance={16} />
    </group>
  )
}

/** Glass-and-rail metro pavilion — reads as a station, not a grate. */
function MetroEntrance({ x, z, y, label }: { x: number; z: number; y: number; label: string }) {
  return (
    <group position={[x, y, z]}>
      <PulseBeacon color="#4cc9f0" height={10} />
      {/* Glass canopy */}
      <mesh castShadow position={[0, 2.6, 0]}>
        <boxGeometry args={[7.2, 0.12, 5.4]} />
        <meshStandardMaterial color="#90e0ef" transparent opacity={0.35} metalness={0.4} roughness={0.15} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={`post-${s}`} castShadow position={[s * 3.2, 1.3, 0]}>
          <boxGeometry args={[0.18, 2.6, 0.18]} />
          <meshStandardMaterial color="#adb5bd" metalness={0.65} roughness={0.3} />
        </mesh>
      ))}
      {/* Stair pit */}
      <mesh position={[0, -0.7, 0.4]}>
        <boxGeometry args={[4.2, 1.5, 3.6]} />
        <meshStandardMaterial color="#14171b" roughness={0.95} />
      </mesh>
      {[-1.1, -0.55, 0, 0.55, 1.1].map((oz, i) => (
        <mesh key={oz} position={[0, -0.15 - i * 0.22, 1.1 + oz * 0.15]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[3.4, 0.1, 0.7]} />
          <meshStandardMaterial color="#495057" roughness={0.75} />
        </mesh>
      ))}
      {/* Cyan railings */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`rail-${s}`} position={[s * 2.2, 0.7, 0.3]}>
          <boxGeometry args={[0.1, 1.4, 4.2]} />
          <meshStandardMaterial color="#4cc9f0" metalness={0.5} roughness={0.35} emissive="#4cc9f0" emissiveIntensity={0.15} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 3.4, -2.4]}>
        <boxGeometry args={[4.8, 1.1, 0.18]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      <Text position={[0, 3.55, -2.28]} fontSize={0.42} color="#4cc9f0" anchorX="center" outlineWidth={0.03} outlineColor="#000">
        {label.toUpperCase()}
      </Text>
      <Text position={[0, 3.05, -2.28]} fontSize={0.26} color="#52b788" anchorX="center">
        Press E · underground
      </Text>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -1.8]}>
        <ringGeometry args={[1.5, 1.85, 28]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.4} side={THREE.DoubleSide} />
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
      <PulseBeacon color="#ffd60a" height={8} />
      <mesh castShadow position={[0, 2.9, 0]}>
        <boxGeometry args={[g.width, 5.8, g.depth]} />
        <meshStandardMaterial color="#495057" roughness={0.78} metalness={0.18} />
      </mesh>
      {/* Open bay void */}
      <mesh position={[0, 1.55, g.depth * 0.5 - 0.05]}>
        <boxGeometry args={[g.width * 0.78, 3.1, 0.35]} />
        <meshStandardMaterial color="#0d0f12" roughness={0.95} />
      </mesh>
      <mesh position={[0, 3.15, g.depth * 0.5 + 0.15]}>
        <boxGeometry args={[g.width * 0.88, 0.55, 0.4]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.28} />
      </mesh>
      {/* Hazard stripes on lintel */}
      {[-2.4, -0.8, 0.8, 2.4].map((ox) => (
        <mesh key={ox} position={[ox, 3.15, g.depth * 0.5 + 0.36]}>
          <boxGeometry args={[0.55, 0.45, 0.08]} />
          <meshStandardMaterial color="#111" roughness={0.7} />
        </mesh>
      ))}
      <Text
        position={[0, 4.35, g.depth * 0.5 + 0.45]}
        fontSize={0.48}
        color="#ffd60a"
        anchorX="center"
        outlineWidth={0.03}
        outlineColor="#000"
      >
        {g.label.toUpperCase()}
      </Text>
      <Text position={[0, 3.7, g.depth * 0.5 + 0.45]} fontSize={0.28} color="#52b788" anchorX="center">
        Press E to enter
      </Text>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, g.depth * 0.5 + 1.9]}
      >
        <ringGeometry args={[1.7, 2.05, 28]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 3.2, g.depth * 0.2]} intensity={1.3} color="#fff3bf" distance={14} />
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
      mat.current.emissiveIntensity = 0.22 + Math.sin(state.clock.elapsedTime * 1.8) * 0.12
    }
  })
  return (
    <group position={[door.x, door.y, door.z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[1.15, 2.4, 0.14]} />
        <meshStandardMaterial ref={mat} color="#3a0ca3" emissive="#7209b7" emissiveIntensity={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0.35, 1.15, 0.08]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffd60a" metalness={0.7} roughness={0.3} />
      </mesh>
      <Text position={[0, 2.65, 0.12]} fontSize={0.22} color="#c77dff" anchorX="center" outlineWidth={0.02} outlineColor="#000">
        CELLAR
      </Text>
      <Text position={[0, 2.3, 0.12]} fontSize={0.2} color="#ced4da" anchorX="center" maxWidth={2.6}>
        {shopLabel}
      </Text>
    </group>
  )
}

function DowntownGuideSign({ y }: { y: number }) {
  return (
    <group position={[18, y, 10]}>
      <mesh castShadow position={[0, 2.4, 0]}>
        <boxGeometry args={[0.16, 4.8, 0.16]} />
        <meshStandardMaterial color="#495057" />
      </mesh>
      <mesh castShadow position={[0, 4.1, 0]}>
        <boxGeometry args={[5.8, 2.4, 0.14]} />
        <meshStandardMaterial color="#1a1d21" roughness={0.55} />
      </mesh>
      <Text position={[0, 4.55, 0.1]} fontSize={0.34} color="#ffd60a" anchorX="center">
        DOWNTOWN AHEAD →
      </Text>
      <Text position={[0, 4.0, 0.1]} fontSize={0.22} color="#4cc9f0" anchorX="center" maxWidth={5.4}>
        Main Square Station · cyan pavilion · E
      </Text>
      <Text position={[0, 3.55, 0.1]} fontSize={0.2} color="#e9ecef" anchorX="center" maxWidth={5.4}>
        Yellow bay = garage · green mat = shops · purple cellar doors
      </Text>
    </group>
  )
}

export function CityFeatureMarkers({
  getHeight,
}: {
  getHeight: (x: number, z: number) => number
}) {
  const seen = new Set<string>()
  const metros = TUNNEL_SEGMENTS.filter((s) => {
    if (!s.surfaceExit) return false
    const key = `${s.x},${s.z}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <>
      <DowntownGuideSign y={getHeight(18, 10) + 0.12} />
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
        return (
          <SecretDoorMarker
            key={p.id}
            door={door}
            shopLabel={b?.shop ?? 'Shop'}
          />
        )
      })}
    </>
  )
}
