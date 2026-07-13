import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import {
  CITY_BUILDINGS,
  CITY_LAUNCH_PADS,
  buildingRoofY,
  buildingDepth,
  getBuildingById,
} from '../game/cityBuildings'

type VehicleKind = 'car' | 'bus' | 'police' | 'fire' | 'taxi'

type Lane = {
  axis: 'x' | 'z'
  /** Fixed coordinate on the other axis */
  fixed: number
  /** Min/max along travel axis */
  min: number
  max: number
  /** Direction along travel axis */
  dir: 1 | -1
  speed: number
  kind: VehicleKind
  offset: number
}

const LANES: Lane[] = [
  { axis: 'x', fixed: 0, min: -80, max: 280, dir: 1, speed: 14, kind: 'car', offset: 0 },
  { axis: 'x', fixed: 22, min: -60, max: 300, dir: -1, speed: 12, kind: 'taxi', offset: 40 },
  { axis: 'x', fixed: 44, min: -40, max: 260, dir: 1, speed: 10, kind: 'bus', offset: 80 },
  { axis: 'x', fixed: 66, min: -70, max: 290, dir: -1, speed: 16, kind: 'police', offset: 20 },
  { axis: 'x', fixed: 88, min: -50, max: 310, dir: 1, speed: 11, kind: 'fire', offset: 120 },
  { axis: 'x', fixed: 110, min: -30, max: 270, dir: -1, speed: 13, kind: 'car', offset: 60 },
  { axis: 'z', fixed: 20, min: -40, max: 220, dir: 1, speed: 12, kind: 'taxi', offset: 30 },
  { axis: 'z', fixed: 42, min: -20, max: 240, dir: -1, speed: 15, kind: 'police', offset: 90 },
  { axis: 'z', fixed: 64, min: -50, max: 200, dir: 1, speed: 9, kind: 'bus', offset: 10 },
  { axis: 'z', fixed: 86, min: -10, max: 230, dir: -1, speed: 14, kind: 'car', offset: 70 },
  { axis: 'z', fixed: 130, min: 0, max: 250, dir: 1, speed: 11, kind: 'fire', offset: 50 },
  { axis: 'z', fixed: 152, min: -30, max: 210, dir: -1, speed: 13, kind: 'taxi', offset: 110 },
]

function VehicleMesh({ kind }: { kind: VehicleKind }) {
  if (kind === 'bus') {
    return (
      <group>
        <mesh castShadow position={[0, 1.35, 0]}>
          <boxGeometry args={[2.4, 2.5, 8.5]} />
          <meshStandardMaterial color="#e9c46a" roughness={0.55} metalness={0.2} />
        </mesh>
        <mesh position={[0, 2.2, 3.6]}>
          <boxGeometry args={[2.2, 1.0, 0.1]} />
          <meshStandardMaterial color="#90e0ef" roughness={0.2} metalness={0.3} />
        </mesh>
        {[-2.8, -0.5, 2.2].map((z) => (
          <mesh key={z} position={[-1.1, 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 10]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ))}
      </group>
    )
  }
  if (kind === 'police') {
    return (
      <group>
        <mesh castShadow position={[0, 0.7, 0]}>
          <boxGeometry args={[1.9, 1.1, 4.4]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0, 1.15, -0.2]}>
          <boxGeometry args={[1.7, 0.7, 2.2]} />
          <meshStandardMaterial color="#1d3557" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.65, 0.1]}>
          <boxGeometry args={[0.5, 0.2, 0.9]} />
          <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 1.65, -0.5]}>
          <boxGeometry args={[0.5, 0.2, 0.9]} />
          <meshStandardMaterial color="#457b9d" emissive="#457b9d" emissiveIntensity={0.8} />
        </mesh>
      </group>
    )
  }
  if (kind === 'fire') {
    return (
      <group>
        <mesh castShadow position={[0, 1.1, 0]}>
          <boxGeometry args={[2.2, 1.8, 6.5]} />
          <meshStandardMaterial color="#d62828" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 2.2, -1.2]}>
          <boxGeometry args={[0.35, 2.2, 0.35]} />
          <meshStandardMaterial color="#adb5bd" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.6, 2.4]}>
          <boxGeometry args={[2.0, 1.0, 1.4]} />
          <meshStandardMaterial color="#212529" roughness={0.6} />
        </mesh>
      </group>
    )
  }
  const body = kind === 'taxi' ? '#ffd60a' : '#457b9d'
  return (
    <group>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.8, 0.85, 4.0]} />
        <meshStandardMaterial color={body} roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, -0.15]}>
        <boxGeometry args={[1.6, 0.65, 2.0]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, -0.15]}>
        <boxGeometry args={[1.45, 0.5, 1.7]} />
        <meshStandardMaterial color="#90e0ef" transparent opacity={0.45} roughness={0.1} />
      </mesh>
    </group>
  )
}

function TrafficLayer() {
  const group = useRef<THREE.Group>(null)
  const getHeight = BIOME_CONFIGS.city.getHeight

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.children.forEach((child, i) => {
      const lane = LANES[i]
      if (!lane) return
      const span = lane.max - lane.min
      const u = ((t * lane.speed * lane.dir + lane.offset) % span + span) % span
      const along = lane.min + u
      if (lane.axis === 'x') {
        child.position.set(along, getHeight(along, lane.fixed) + 0.15, lane.fixed)
        child.rotation.y = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      } else {
        child.position.set(lane.fixed, getHeight(lane.fixed, along) + 0.15, along)
        child.rotation.y = lane.dir > 0 ? 0 : Math.PI
      }
    })
  })

  return (
    <group ref={group}>
      {LANES.map((lane, i) => (
        <group key={i}>
          <VehicleMesh kind={lane.kind} />
        </group>
      ))}
    </group>
  )
}

type Ped = { x0: number; z0: number; amp: number; axis: 'x' | 'z'; speed: number; hue: number }

const PEDS: Ped[] = Array.from({ length: 28 }, (_, i) => ({
  x0: -40 + (i % 7) * 38 + (i % 3) * 4,
  z0: 15 + Math.floor(i / 7) * 42 + (i % 5) * 3,
  amp: 8 + (i % 5) * 3,
  axis: i % 2 === 0 ? 'x' : 'z',
  speed: 0.55 + (i % 4) * 0.15,
  hue: i * 37,
}))

function PedestrianLayer() {
  const group = useRef<THREE.Group>(null)
  const getHeight = BIOME_CONFIGS.city.getHeight

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.children.forEach((child, i) => {
      const p = PEDS[i]
      if (!p) return
      const walk = Math.sin(t * p.speed + i) * p.amp
      const x = p.axis === 'x' ? p.x0 + walk : p.x0
      const z = p.axis === 'z' ? p.z0 + walk : p.z0
      const y = getHeight(x, z)
      child.position.set(x, y, z)
      const vx = p.axis === 'x' ? Math.cos(t * p.speed + i) : 0
      const vz = p.axis === 'z' ? Math.cos(t * p.speed + i) : 0
      child.rotation.y = Math.atan2(vx, vz)
      // Leg bob
      const leg = child.children[1] as THREE.Group | undefined
      const leg2 = child.children[2] as THREE.Group | undefined
      if (leg) leg.rotation.x = Math.sin(t * p.speed * 6 + i) * 0.55
      if (leg2) leg2.rotation.x = Math.sin(t * p.speed * 6 + i + Math.PI) * 0.55
    })
  })

  return (
    <group ref={group}>
      {PEDS.map((p, i) => {
        const shirt = `hsl(${(p.hue * 3) % 360} 45% 45%)`
        const pants = i % 3 === 0 ? '#1a1a1a' : '#2c3e50'
        return (
          <group key={i}>
            <mesh position={[0, 1.15, 0]} castShadow>
              <capsuleGeometry args={[0.18, 0.45, 4, 8]} />
              <meshStandardMaterial color={shirt} roughness={0.75} />
            </mesh>
            <mesh position={[-0.1, 0.45, 0]}>
              <capsuleGeometry args={[0.07, 0.35, 3, 6]} />
              <meshStandardMaterial color={pants} roughness={0.8} />
            </mesh>
            <mesh position={[0.1, 0.45, 0]}>
              <capsuleGeometry args={[0.07, 0.35, 3, 6]} />
              <meshStandardMaterial color={pants} roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.55, 0]} castShadow>
              <sphereGeometry args={[0.16, 10, 10]} />
              <meshStandardMaterial color="#d4a574" roughness={0.55} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function RooftopPads() {
  const activePad = useGameStore((s) => s.cityLaunchPadId)
  const getHeight = BIOME_CONFIGS.city.getHeight

  return (
    <>
      {CITY_LAUNCH_PADS.map((pad) => {
        const b = getBuildingById(pad.buildingId)
        if (!b) return null
        const roofY = buildingRoofY(b, getHeight)
        const active = pad.id === activePad
        return (
          <group key={pad.id} position={[b.x, roofY + 0.05, b.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[active ? 5.5 : 4.2, 28]} />
              <meshStandardMaterial
                color={active ? '#212529' : '#343a40'}
                roughness={0.85}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[active ? 4.2 : 3.2, active ? 5.2 : 4.0, 28]} />
              <meshStandardMaterial
                color={active ? '#ffd60a' : '#adb5bd'}
                emissive={active ? '#ffd60a' : '#000'}
                emissiveIntensity={active ? 0.55 : 0}
                roughness={0.5}
              />
            </mesh>
            {active && (
              <>
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, pad.yaw]}>
                  <planeGeometry args={[1.2, 6]} />
                  <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.4} />
                </mesh>
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, pad.yaw + Math.PI / 2]}>
                  <planeGeometry args={[1.2, 6]} />
                  <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.4} />
                </mesh>
                {/* Windsock */}
                <mesh position={[4.5, 1.4, 0]} castShadow>
                  <cylinderGeometry args={[0.06, 0.06, 2.8, 6]} />
                  <meshStandardMaterial color="#ced4da" metalness={0.6} />
                </mesh>
                <mesh position={[5.2, 2.4, 0]} rotation={[0, 0, -0.4]}>
                  <coneGeometry args={[0.35, 1.1, 6]} />
                  <meshStandardMaterial color="#e63946" roughness={0.7} />
                </mesh>
              </>
            )}
          </group>
        )
      })}
    </>
  )
}

function TrafficLights() {
  const lights = useMemo(
    () =>
      [
        [22, 22],
        [44, 44],
        [66, 66],
        [88, 88],
        [110, 110],
        [20, 64],
        [42, 130],
        [86, 42],
      ] as [number, number][],
    [],
  )
  const getHeight = BIOME_CONFIGS.city.getHeight
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  useFrame((state) => {
    const phase = Math.floor(state.clock.elapsedTime * 0.5) % 3
    mats.current.forEach((m, i) => {
      if (!m) return
      const on = i % 3 === phase
      m.emissiveIntensity = on ? 1.2 : 0.05
    })
  })

  return (
    <>
      {lights.map(([x, z], i) => {
        const y = getHeight(x, z)
        return (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, 2.2, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 4.4, 6]} />
              <meshStandardMaterial color="#212529" />
            </mesh>
            <mesh position={[0, 4.5, 0]}>
              <boxGeometry args={[0.35, 0.9, 0.25]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            {([0.25, 0, -0.25] as const).map((oy, j) => (
              <mesh key={j} position={[0, 4.5 + oy, 0.14]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial
                  ref={(r) => {
                    mats.current[i * 3 + j] = r
                  }}
                  color={j === 0 ? '#e63946' : j === 1 ? '#ffd60a' : '#52b788'}
                  emissive={j === 0 ? '#e63946' : j === 1 ? '#ffd60a' : '#52b788'}
                  emissiveIntensity={0.1}
                />
              </mesh>
            ))}
          </group>
        )
      })}
    </>
  )
}

function Crosswalks() {
  const marks = useMemo(
    () =>
      [
        [22, 22],
        [44, 44],
        [66, 66],
        [88, 88],
        [110, 110],
        [42, 64],
        [86, 130],
      ] as [number, number][],
    [],
  )
  const getHeight = BIOME_CONFIGS.city.getHeight
  return (
    <>
      {marks.map(([x, z], i) => {
        const y = getHeight(x, z) + 0.12
        return (
          <group key={i} position={[x, y, z]}>
            {Array.from({ length: 6 }, (_, k) => (
              <mesh key={k} rotation={[-Math.PI / 2, 0, i % 2 === 0 ? 0 : Math.PI / 2]} position={[0, 0, -1.5 + k * 0.55]}>
                <planeGeometry args={[2.4, 0.35]} />
                <meshStandardMaterial color="#f8f9fa" roughness={0.9} />
              </mesh>
            ))}
          </group>
        )
      })}
    </>
  )
}

/** Living city layer — traffic, pedestrians, rooftop pads, street furniture. */
export function CityLife() {
  const biome = useGameStore((s) => s.biome)
  if (biome !== 'city') return null
  return (
    <group>
      <TrafficLayer />
      <PedestrianLayer />
      <RooftopPads />
      <TrafficLights />
      <Crosswalks />
      {/* Neon under-awning glow for shopfronts */}
      {CITY_BUILDINGS.filter((b) => b.shop).map((b) => {
        const d = buildingDepth(b)
        const gy = BIOME_CONFIGS.city.getHeight(b.x, b.z)
        return (
          <pointLight
            key={`glow-${b.id}`}
            position={[b.x, gy + 3.1, b.z + d * 0.55]}
            intensity={0.55}
            distance={10}
            color={b.shopColor ?? '#c1272d'}
          />
        )
      })}
    </group>
  )
}
