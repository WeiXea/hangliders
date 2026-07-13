import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import {
  CITY_LAUNCH_PADS,
  CITY_STREET_DECK,
  buildingRoofY,
  getBuildingById,
} from '../game/cityBuildings'
import { setTrafficSnapshots } from '../game/trafficRegistry'

export type VehicleKind = 'car' | 'bus' | 'police' | 'fire' | 'taxi'

type Lane = {
  axis: 'x' | 'z'
  fixed: number
  min: number
  max: number
  dir: 1 | -1
  speed: number
  kind: VehicleKind
  offset: number
  color?: string
}

/** Lanes sit in the real 22m street grid (not through buildings). */
const LANES: Lane[] = [
  { axis: 'x', fixed: 0, min: -50, max: 230, dir: 1, speed: 11, kind: 'car', offset: 0, color: '#2a6f97' },
  { axis: 'x', fixed: 44, min: -40, max: 220, dir: 1, speed: 8, kind: 'bus', offset: 80 },
  { axis: 'x', fixed: 66, min: -50, max: 230, dir: -1, speed: 13, kind: 'police', offset: 20 },
  { axis: 'x', fixed: 110, min: -50, max: 230, dir: -1, speed: 10, kind: 'taxi', offset: 60 },
  { axis: 'z', fixed: 22, min: -10, max: 200, dir: -1, speed: 11, kind: 'car', offset: 90, color: '#bc4749' },
  { axis: 'z', fixed: 66, min: -10, max: 200, dir: -1, speed: 10, kind: 'fire', offset: 70 },
  { axis: 'z', fixed: 110, min: -10, max: 200, dir: 1, speed: 9, kind: 'taxi', offset: 110 },
  { axis: 'z', fixed: 154, min: 0, max: 185, dir: 1, speed: 8, kind: 'bus', offset: 25 },
]

const LANE_HALF_WIDTH = 2.8
const STOP_LOOKAHEAD = 14
const FOLLOW_GAP = 9

type TrafficSim = { along: number; speed: number }

function laneAlong(lane: Lane, x: number, z: number) {
  return lane.axis === 'x' ? x : z
}

function aheadDistance(lane: Lane, fromAlong: number, toAlong: number) {
  const span = lane.max - lane.min
  let d = (toAlong - fromAlong) * lane.dir
  if (d < 0) d += span
  return d
}

function inLaneCorridor(lane: Lane, x: number, z: number) {
  const lateral = lane.axis === 'x' ? Math.abs(z - lane.fixed) : Math.abs(x - lane.fixed)
  return lateral < LANE_HALF_WIDTH
}

function Wheel({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0.34 * scale, z]} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.28, 14]} />
        <meshStandardMaterial color="#111111" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.3, 10]} />
        <meshStandardMaterial color="#ced4da" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  )
}

function SedanBody({ color, accent }: { color: string; accent?: string }) {
  return (
    <group>
      {/* Chassis with rounded silhouette via layered capsules/boxes */}
      <mesh castShadow position={[0, 0.42, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.42, 2.6, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.28} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.7, 0.45, 3.6]} />
        <meshStandardMaterial color={color} roughness={0.28} metalness={0.55} />
      </mesh>
      {/* Cabin bubble */}
      <mesh castShadow position={[0, 0.98, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.48, 1.1, 4, 8]} />
        <meshStandardMaterial color={accent ?? '#1c1c1c'} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.0, 0.55]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[1.35, 0.55]} />
        <meshStandardMaterial color="#caf0f8" transparent opacity={0.55} roughness={0.05} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.0, -0.85]} rotation={[-0.25, 0, 0]}>
        <planeGeometry args={[1.35, 0.5]} />
        <meshStandardMaterial color="#caf0f8" transparent opacity={0.45} roughness={0.05} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Lights */}
      {([-0.52, 0.52] as const).map((x) => (
        <mesh key={`h${x}`} position={[x, 0.48, 1.95]}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.85} />
        </mesh>
      ))}
      {([-0.52, 0.52] as const).map((x) => (
        <mesh key={`t${x}`} position={[x, 0.48, -1.95]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={0.55} />
        </mesh>
      ))}
      <Wheel x={-0.78} z={1.15} />
      <Wheel x={0.78} z={1.15} />
      <Wheel x={-0.78} z={-1.25} />
      <Wheel x={0.78} z={-1.25} />
    </group>
  )
}

export function VehicleMesh({ kind, color }: { kind: VehicleKind; color?: string }) {
  const blink = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((state) => {
    if (!blink.current) return
    const on = Math.floor(state.clock.elapsedTime * 4) % 2 === 0
    blink.current.emissiveIntensity = on ? 1.4 : 0.15
  })

  if (kind === 'bus') {
    return (
      <group>
        <mesh castShadow position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[1.05, 6.2, 6, 14]} />
          <meshStandardMaterial color="#e9c46a" roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[0, 1.35, 0]}>
          <boxGeometry args={[2.2, 2.0, 7.8]} />
          <meshStandardMaterial color="#e9c46a" roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.55, 3.85]}>
          <planeGeometry args={[1.9, 1.2]} />
          <meshStandardMaterial color="#90e0ef" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        {[-2.4, -0.5, 1.4].map((z) => (
          <mesh key={z} position={[1.12, 1.65, z]}>
            <planeGeometry args={[0.05, 0.9]} />
            <meshStandardMaterial color="#90e0ef" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {[-2.9, -0.7, 1.5, 3.0].map((z) => (
          <Wheel key={z} x={-1.0} z={z} scale={1.15} />
        ))}
        {[-2.9, -0.7, 1.5, 3.0].map((z) => (
          <Wheel key={`r${z}`} x={1.0} z={z} scale={1.15} />
        ))}
      </group>
    )
  }

  if (kind === 'police') {
    return (
      <group>
        <SedanBody color="#f8f9fa" accent="#1d3557" />
        <mesh position={[0, 1.55, 0.05]}>
          <boxGeometry args={[0.85, 0.18, 1.3]} />
          <meshStandardMaterial color="#212529" />
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
        <mesh castShadow position={[0, 0.95, -0.2]}>
          <boxGeometry args={[2.25, 1.35, 6.4]} />
          <meshStandardMaterial color="#d62828" roughness={0.4} metalness={0.35} />
        </mesh>
        <mesh castShadow position={[0, 1.55, 2.35]}>
          <boxGeometry args={[2.15, 1.15, 1.7]} />
          <meshStandardMaterial color="#212529" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.6, 2.55]}>
          <boxGeometry args={[1.9, 0.7, 0.08]} />
          <meshStandardMaterial color="#90e0ef" transparent opacity={0.45} />
        </mesh>
        <mesh position={[0, 2.4, -1.4]} castShadow>
          <boxGeometry args={[0.2, 2.0, 0.2]} />
          <meshStandardMaterial color="#ced4da" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0.55, 2.1, -0.4]} rotation={[0, 0, 0.15]} castShadow>
          <boxGeometry args={[0.12, 0.12, 3.2]} />
          <meshStandardMaterial color="#adb5bd" metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.55, -3.3]}>
          <boxGeometry args={[2.0, 0.7, 0.5]} />
          <meshStandardMaterial color="#212529" />
        </mesh>
        {[-2.2, -0.4, 1.4, 2.6].map((z) => (
          <Wheel key={z} x={-1.0} z={z} />
        ))}
        {[-2.2, -0.4, 1.4, 2.6].map((z) => (
          <Wheel key={`r${z}`} x={1.0} z={z} />
        ))}
      </group>
    )
  }

  if (kind === 'taxi') {
    return (
      <group>
        <SedanBody color="#ffd60a" accent="#1a1a1a" />
        <mesh position={[0, 1.5, -0.1]}>
          <boxGeometry args={[0.7, 0.2, 1.0]} />
          <meshStandardMaterial color="#212529" />
        </mesh>
        <mesh position={[0, 1.58, -0.1]}>
          <boxGeometry args={[0.55, 0.08, 0.8]} />
          <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.35} />
        </mesh>
        {/* Checker stripe */}
        <mesh position={[0.93, 0.7, 0]}>
          <boxGeometry args={[0.04, 0.25, 3.6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
    )
  }

  return <SedanBody color={color && color.startsWith('#') ? color : '#457b9d'} />
}

function TrafficLayer() {
  const group = useRef<THREE.Group>(null)
  const getHeight = BIOME_CONFIGS.city.getHeight
  const lastT = useRef(0)
  const sims = useRef<TrafficSim[]>(
    LANES.map((lane) => {
      const span = lane.max - lane.min
      const along = lane.min + ((((lane.offset % span) + span) % span))
      return { along, speed: lane.speed }
    }),
  )

  useFrame((state) => {
    if (!group.current) return
    const flight = useGameStore.getState().flight
    const drivenId = flight.phase === 'driving' ? flight.vehicleId : -1
    const t = state.clock.elapsedTime
    const dt = Math.min(0.05, lastT.current > 0 ? t - lastT.current : 1 / 60)
    lastT.current = t

    const walkerInRoad =
      flight.phase === 'walking' ||
      flight.phase === 'landed' ||
      flight.phase === 'grounded' ||
      flight.phase === 'running'
    const pedX = flight.position.x
    const pedZ = flight.position.z

    // Desired cruise speed per lane (brake for pedestrians / lead cars)
    const targets = LANES.map((lane, i) => {
      if (drivenId === i) return 0
      let want = lane.speed

      if (walkerInRoad && inLaneCorridor(lane, pedX, pedZ)) {
        const pedAlong = laneAlong(lane, pedX, pedZ)
        const ahead = aheadDistance(lane, sims.current[i]!.along, pedAlong)
        if (ahead > 0.4 && ahead < STOP_LOOKAHEAD) {
          // Soft stop: closer → slower, fully stop within ~4m
          const factor = Math.max(0, (ahead - 3.2) / (STOP_LOOKAHEAD - 3.2))
          want = Math.min(want, lane.speed * factor * factor)
          if (ahead < 4.5) want = 0
        }
      }

      for (let j = 0; j < LANES.length; j++) {
        if (j === i || drivenId === j) continue
        const other = LANES[j]!
        if (other.axis !== lane.axis || other.fixed !== lane.fixed || other.dir !== lane.dir) {
          continue
        }
        const gap = aheadDistance(lane, sims.current[i]!.along, sims.current[j]!.along)
        if (gap > 0.5 && gap < FOLLOW_GAP) {
          const lead = sims.current[j]!.speed
          const factor = Math.max(0, (gap - 3.5) / (FOLLOW_GAP - 3.5))
          want = Math.min(want, lead * 0.85 + lead * 0.15 * factor)
          if (gap < 4) want = Math.min(want, Math.max(0, lead - 1))
        }
      }

      return want
    })

    const snaps: {
      id: number
      kind: VehicleKind
      x: number
      z: number
      yaw: number
      speed: number
      color?: string
      taken: boolean
    }[] = []

    group.current.children.forEach((child, i) => {
      const lane = LANES[i]
      const sim = sims.current[i]
      if (!lane || !sim) return

      if (drivenId === i) {
        child.visible = false
        snaps.push({
          id: i,
          kind: lane.kind,
          x: flight.position.x,
          z: flight.position.z,
          yaw: flight.yaw,
          speed: Math.abs(flight.airspeed),
          color: lane.color,
          taken: true,
        })
        return
      }

      const want = targets[i] ?? lane.speed
      const accel = want >= sim.speed ? 6.5 : 14
      if (sim.speed < want) sim.speed = Math.min(want, sim.speed + accel * dt)
      else sim.speed = Math.max(want, sim.speed - accel * dt)
      if (sim.speed < 0.05) sim.speed = 0

      const span = lane.max - lane.min
      sim.along += sim.speed * lane.dir * dt
      while (sim.along > lane.max) sim.along -= span
      while (sim.along < lane.min) sim.along += span

      let x: number
      let z: number
      let yaw: number
      if (lane.axis === 'x') {
        x = sim.along
        z = lane.fixed
        yaw = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      } else {
        x = lane.fixed
        z = sim.along
        yaw = lane.dir > 0 ? 0 : Math.PI
      }

      child.visible = true
      child.position.set(x, getHeight(x, z) + CITY_STREET_DECK, z)
      child.rotation.y = yaw
      // Subtle brake squat when slowing
      const squat = want < sim.speed - 0.5 ? 0.04 : 0
      child.position.y -= squat

      snaps.push({
        id: i,
        kind: lane.kind,
        x,
        z,
        yaw,
        speed: sim.speed,
        color: lane.color,
        taken: false,
      })
    })

    setTrafficSnapshots(snaps)
  })

  return (
    <group ref={group}>
      {LANES.map((lane, i) => (
        <group key={i}>
          <VehicleMesh kind={lane.kind} color={lane.color} />
        </group>
      ))}
    </group>
  )
}

type Ped = {
  x0: number
  z0: number
  amp: number
  axis: 'x' | 'z'
  speed: number
  hue: number
  skin: string
}

const SKINS = ['#e0a882', '#c68642', '#8d5524', '#f1c27d', '#d4a574']

const PEDS: Ped[] = Array.from({ length: 14 }, (_, i) => ({
  // Walk sidewalks beside the 22m grid
  x0: -40 + (i % 7) * 38 + ((i % 2) * 7 - 3.5),
  z0: 8 + Math.floor(i / 7) * 88 + ((i % 2) * 7 - 3.5),
  amp: 6 + (i % 5) * 2.5,
  axis: i % 2 === 0 ? 'x' : 'z',
  speed: 0.5 + (i % 4) * 0.12,
  hue: i * 41,
  skin: SKINS[i % SKINS.length]!,
}))

function PedestrianMesh({ shirt, pants, skin }: { shirt: string; pants: string; skin: string }) {
  return (
    <group>
      {/* Torso */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>
      {/* Hips */}
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.34, 0.2, 0.2]} />
        <meshStandardMaterial color={pants} roughness={0.75} />
      </mesh>
      {/* Legs */}
      <group position={[-0.1, 0.7, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.07, 0.28, 3, 6]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.52, 0.02]}>
          <capsuleGeometry args={[0.06, 0.22, 3, 6]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.72, 0.06]}>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
      <group position={[0.1, 0.7, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.07, 0.28, 3, 6]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.52, 0.02]}>
          <capsuleGeometry args={[0.06, 0.22, 3, 6]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.72, 0.06]}>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
      {/* Arms */}
      <group position={[-0.28, 1.25, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.055, 0.28, 3, 6]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
      </group>
      <group position={[0.28, 1.25, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.055, 0.28, 3, 6]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
      </group>
      {/* Head + hair */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.68, -0.02]}>
        <sphereGeometry args={[0.145, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#2b2118" roughness={0.85} />
      </mesh>
    </group>
  )
}

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
      child.position.set(x, getHeight(x, z) + CITY_STREET_DECK, z)
      const vx = p.axis === 'x' ? Math.cos(t * p.speed + i) : 0
      const vz = p.axis === 'z' ? Math.cos(t * p.speed + i) : 0
      child.rotation.y = Math.atan2(vx, vz)
      const root = child.children[0] as THREE.Group | undefined
      if (!root) return
      const leftLeg = root.children[2] as THREE.Group | undefined
      const rightLeg = root.children[3] as THREE.Group | undefined
      const leftArm = root.children[4] as THREE.Group | undefined
      const rightArm = root.children[5] as THREE.Group | undefined
      const gait = Math.sin(t * p.speed * 6.5 + i)
      if (leftLeg) leftLeg.rotation.x = gait * 0.55
      if (rightLeg) rightLeg.rotation.x = -gait * 0.55
      if (leftArm) leftArm.rotation.x = -gait * 0.4
      if (rightArm) rightArm.rotation.x = gait * 0.4
    })
  })

  return (
    <group ref={group}>
      {PEDS.map((p, i) => {
        const shirt = `hsl(${(p.hue * 3) % 360} 42% 42%)`
        const pants = i % 3 === 0 ? '#1a1a1a' : i % 3 === 1 ? '#2c3e50' : '#4a5568'
        return (
          <group key={i}>
            <PedestrianMesh shirt={shirt} pants={pants} skin={p.skin} />
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
              <meshStandardMaterial color={active ? '#212529' : '#343a40'} roughness={0.85} />
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
        [66, 66],
        [110, 110],
        [154, 44],
      ] as [number, number][],
    [],
  )
  const getHeight = BIOME_CONFIGS.city.getHeight
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  useFrame((state) => {
    const phase = Math.floor(state.clock.elapsedTime * 0.5) % 3
    mats.current.forEach((m, i) => {
      if (!m) return
      m.emissiveIntensity = i % 3 === phase ? 1.2 : 0.05
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
    </group>
  )
}
