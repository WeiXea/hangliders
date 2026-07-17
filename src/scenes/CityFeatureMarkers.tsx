import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  CITY_GARAGES,
  ROAD_TUNNEL_DIP,
  ROAD_TUNNEL_RAMP,
  ROAD_TUNNELS,
  SECRET_PASSAGES,
  TUNNEL_SEGMENTS,
  secretDoorWorldPos,
  type RoadTunnel,
} from '../game/cityUnderground'
import { CITY_STREET_DECK, getBuildingById } from '../game/cityBuildings'
import { useCityUrbanMaps } from '../game/cityUrbanMats'

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

/**
 * Dipped underpass: ramps at both mouths, flat floor below street,
 * overpass deck on top so cars go under and come out the other end.
 */
function RoadUnderpass({
  tunnel,
  getHeight,
}: {
  tunnel: RoadTunnel
  getHeight: (x: number, z: number) => number
}) {
  const urban = useCityUrbanMaps()
  const streetY = getHeight(tunnel.x, tunnel.z) + CITY_STREET_DECK
  const len = tunnel.length
  const w = tunnel.halfW * 2
  const dip = ROAD_TUNNEL_DIP
  const ramp = ROAD_TUNNEL_RAMP
  const yaw = tunnel.axis === 'z' ? 0 : Math.PI / 2
  const wallT = 0.7
  const clearH = 4.4
  const deckTop = streetY + 0.35

  const floorGeo = useMemo(() => {
    const segs = 24
    const geo = new THREE.PlaneGeometry(w, len, 1, segs)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    const half = len * 0.5
    const flatEnd = half - ramp
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i)
      const along = Math.abs(z)
      let d = dip
      if (along > flatEnd) {
        const u = Math.max(0, Math.min(1, (half - along) / ramp))
        d = dip * (u * u * (3 - 2 * u))
      }
      pos.setY(i, -d)
    }
    geo.computeVertexNormals()
    return geo
  }, [w, len, dip, ramp])

  return (
    <group position={[tunnel.x, streetY, tunnel.z]} rotation={[0, yaw, 0]}>
      {/* Dipped asphalt roadbed */}
      <mesh geometry={floorGeo} receiveShadow>
        <meshStandardMaterial
          map={urban.asphalt.map}
          normalMap={urban.asphalt.normalMap}
          roughnessMap={urban.asphalt.roughnessMap}
          color="#5a5e64"
          roughness={0.95}
          metalness={0.04}
        />
      </mesh>
      {/* Center line */}
      <mesh position={[0, -dip + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, len - ramp * 1.2]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.4} />
      </mesh>

      {/* Side walls from dipped floor up to deck */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`wall-${s}`}
          castShadow
          receiveShadow
          position={[s * (w * 0.5 + wallT * 0.5), -dip * 0.5 + clearH * 0.15, 0]}
        >
          <boxGeometry args={[wallT, dip + clearH, len]} />
          <meshStandardMaterial
            map={urban.facade.map}
            normalMap={urban.facade.normalMap}
            color="#8a8680"
            roughness={0.88}
            metalness={0.08}
          />
        </mesh>
      ))}

      {/* Structural ribs */}
      {Array.from({ length: 7 }, (_, i) => {
        const oz = -len * 0.4 + (i * len * 0.8) / 6
        return (
          <mesh key={`rib-${i}`} position={[0, -dip + clearH * 0.55, oz]}>
            <boxGeometry args={[w + wallT * 2.2, 0.35, 0.45]} />
            <meshStandardMaterial
              map={urban.plate.map}
              metalnessMap={urban.plate.metalnessMap}
              color="#4a4842"
              roughness={0.45}
              metalness={0.85}
            />
          </mesh>
        )
      })}

      {/* Overpass deck — street continues on top */}
      <mesh castShadow receiveShadow position={[0, deckTop - streetY, 0]}>
        <boxGeometry args={[w + wallT * 2.5, 0.55, len]} />
        <meshStandardMaterial
          map={urban.asphalt.map}
          color="#4a4e54"
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>
      {/* Deck edge railings */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`rail-${s}`} position={[s * (w * 0.5 + 0.9), deckTop - streetY + 0.55, 0]}>
          <boxGeometry args={[0.18, 0.9, len]} />
          <meshStandardMaterial
            map={urban.plate.map}
            metalnessMap={urban.plate.metalnessMap}
            color="#3a3832"
            roughness={0.4}
            metalness={0.9}
          />
        </mesh>
      ))}

      {/* Fluorescent strips (emissive only — no point lights) */}
      {Array.from({ length: 5 }, (_, i) => {
        const oz = -len * 0.35 + (i * len * 0.7) / 4
        return (
          <mesh key={`lamp-${i}`} position={[0, -dip + clearH - 0.35, oz]}>
            <boxGeometry args={[w * 0.5, 0.08, 1.6]} />
            <meshStandardMaterial color="#fff8e7" emissive="#ffe8a3" emissiveIntensity={1.6} />
          </mesh>
        )
      })}

      {/* Portal mouths */}
      {([-1, 1] as const).map((s) => (
        <group key={`mouth-${s}`} position={[0, 0, s * (len * 0.5)]}>
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              castShadow
              position={[side * (w * 0.5 + 0.4), -dip * 0.25 + 1.2, s * 0.35]}
            >
              <boxGeometry args={[0.85, dip + clearH * 0.7, 0.85]} />
              <meshStandardMaterial
                map={urban.plate.map}
                metalnessMap={urban.plate.metalnessMap}
                color="#2a2824"
                roughness={0.5}
                metalness={0.8}
              />
            </mesh>
          ))}
          <mesh position={[0, deckTop - streetY + 0.45, s * 0.35]}>
            <boxGeometry args={[w + 2.4, 0.65, 0.8]} />
            <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.5} />
          </mesh>
          <Suspense fallback={null}>
            <Text
              position={[0, deckTop - streetY + 1.35, s * 0.7]}
              rotation={[0, s > 0 ? Math.PI : 0, 0]}
              fontSize={0.45}
              color="#ffd60a"
              anchorX="center"
              outlineWidth={0.035}
              outlineColor="#000"
            >
              {tunnel.label.toUpperCase()}
            </Text>
            <Text
              position={[0, deckTop - streetY + 0.85, s * 0.7]}
              rotation={[0, s > 0 ? Math.PI : 0, 0]}
              fontSize={0.24}
              color="#e9ecef"
              anchorX="center"
            >
              UNDERPASS
            </Text>
          </Suspense>
        </group>
      ))}
      <PulseBeacon color="#ffd60a" height={9} />
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
        <boxGeometry args={[5.8, 2.6, 0.14]} />
        <meshStandardMaterial color="#1a1d21" roughness={0.55} />
      </mesh>
      <Text position={[0, 4.7, 0.1]} fontSize={0.32} color="#ffd60a" anchorX="center">
        DOWNTOWN AHEAD →
      </Text>
      <Text position={[0, 4.15, 0.1]} fontSize={0.2} color="#4cc9f0" anchorX="center" maxWidth={5.4}>
        Cyan pavilion = metro walk (E)
      </Text>
      <Text position={[0, 3.7, 0.1]} fontSize={0.2} color="#ffd60a" anchorX="center" maxWidth={5.4}>
        Yellow underpass = drive under · out the other end
      </Text>
      <Text position={[0, 3.3, 0.1]} fontSize={0.18} color="#e9ecef" anchorX="center" maxWidth={5.4}>
        Green mat = shops · yellow bay = garage
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
      {ROAD_TUNNELS.map((t) => (
        <RoadUnderpass key={`road-${t.id}`} tunnel={t} getHeight={getHeight} />
      ))}
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
