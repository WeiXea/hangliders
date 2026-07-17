import { Suspense, useMemo, useRef, useState } from 'react'
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
import {
  setMovingTraffic,
  setParkedTraffic,
  pedInVehiclePath,
  consumeNpcVehicleHit,
  vehicleRadius,
  getLiveParkedVehicles,
  isLaneClaimed,
} from '../game/trafficRegistry'
import { roadTunnelFloorY } from '../game/cityRoadTunnels'
import type { VehicleKind } from '../game/VehicleModels'
import { KenneyVehicleMesh as VehicleMesh, preloadKenneyVehicles } from '../game/KenneyVehicle'

export type { VehicleKind }
export { VehicleMesh }

preloadKenneyVehicles()

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
  { axis: 'x', fixed: 0, min: -50, max: 230, dir: 1, speed: 16, kind: 'car', offset: 0, color: '#2a6f97' },
  { axis: 'x', fixed: 44, min: -40, max: 220, dir: 1, speed: 12, kind: 'bus', offset: 80 },
  /** Midtown Underpass (z=66) — cars dive under and climb out */
  { axis: 'x', fixed: 66, min: -50, max: 230, dir: -1, speed: 18, kind: 'police', offset: 20 },
  { axis: 'x', fixed: 110, min: -50, max: 230, dir: -1, speed: 17, kind: 'taxi', offset: 60 },
  { axis: 'z', fixed: 22, min: -10, max: 200, dir: -1, speed: 16, kind: 'car', offset: 90, color: '#bc4749' },
  /** Central Underpass (x=44) — north–south through traffic */
  { axis: 'z', fixed: 44, min: -10, max: 200, dir: 1, speed: 15, kind: 'car', offset: 55, color: '#6a994e' },
  { axis: 'z', fixed: 66, min: -10, max: 200, dir: -1, speed: 15, kind: 'fire', offset: 70 },
  { axis: 'z', fixed: 110, min: -10, max: 200, dir: 1, speed: 15, kind: 'taxi', offset: 110 },
  { axis: 'z', fixed: 154, min: 0, max: 185, dir: 1, speed: 12, kind: 'bus', offset: 25 },
]

const LANE_HALF_WIDTH = 5.5
const STOP_LOOKAHEAD = 18
const FOLLOW_GAP = 9

type TrafficSim = { along: number; speed: number; stun: number }

function laneWorld(lane: Lane, along: number) {
  if (lane.axis === 'x') {
    return {
      x: along,
      z: lane.fixed,
      yaw: lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2,
    }
  }
  return {
    x: lane.fixed,
    z: along,
    yaw: lane.dir > 0 ? 0 : Math.PI,
  }
}

function aheadDistance(lane: Lane, fromAlong: number, toAlong: number) {
  const span = lane.max - lane.min
  let d = (toAlong - fromAlong) * lane.dir
  if (d < 0) d += span
  // Ignore wrap-around "ahead" (almost full lap) — not a real obstacle
  if (d > span * 0.5) return span
  return d
}

function TrafficLayer() {
  const group = useRef<THREE.Group>(null)
  const getHeight = BIOME_CONFIGS.city.getHeight
  const lastT = useRef(0)
  const sims = useRef<TrafficSim[]>(
    LANES.map((lane) => {
      const span = lane.max - lane.min
      const along = lane.min + ((((lane.offset % span) + span) % span))
      return { along, speed: lane.speed, stun: 0 }
    }),
  )

  useFrame((state) => {
    if (!group.current) return
    const flight = useGameStore.getState().flight
    const remote = useGameStore.getState().remoteFlight
    const drivenId = flight.phase === 'driving' ? flight.vehicleId : -1
    const remoteDriven = remote?.phase === 'driving' ? remote.vehicleId : -1
    const t = state.clock.elapsedTime
    const dt = Math.min(0.05, lastT.current > 0 ? t - lastT.current : 1 / 60)
    lastT.current = t

    const yieldToPed =
      flight.phase === 'walking' ||
      flight.phase === 'landed' ||
      flight.phase === 'grounded' ||
      flight.phase === 'running'
    const pedX = flight.position.x
    const pedZ = flight.position.z

    const targets = LANES.map((lane, i) => {
      if (drivenId === i || remoteDriven === i || isLaneClaimed(i)) return 0
      const sim = sims.current[i]!
      if (sim.stun > 0) {
        sim.stun = Math.max(0, sim.stun - dt)
        return 0
      }
      let want = lane.speed
      const world = laneWorld(lane, sim.along)

      if (yieldToPed) {
        const hit = pedInVehiclePath(
          world.x,
          world.z,
          world.yaw,
          pedX,
          pedZ,
          STOP_LOOKAHEAD,
          LANE_HALF_WIDTH,
        )
        if (hit) {
          // Hard stop inside ~6m, taper before that
          if (hit.ahead < 6.5) want = 0
          else {
            const taper = (hit.ahead - 6.5) / (STOP_LOOKAHEAD - 6.5)
            want = Math.min(want, lane.speed * taper * taper)
          }
        }
      }

      for (let j = 0; j < LANES.length; j++) {
        if (j === i || drivenId === j || remoteDriven === j) continue
        const other = LANES[j]!
        if (other.axis !== lane.axis || other.fixed !== lane.fixed || other.dir !== lane.dir) {
          continue
        }
        const gap = aheadDistance(lane, sim.along, sims.current[j]!.along)
        if (gap > 0.5 && gap < FOLLOW_GAP) {
          const lead = sims.current[j]!.speed
          const factor = Math.max(0, (gap - 3.5) / (FOLLOW_GAP - 3.5))
          want = Math.min(want, lead * 0.85 + lead * 0.15 * factor)
          if (gap < 4.5) want = Math.min(want, Math.max(0, lead - 1))
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
      parked?: boolean
    }[] = []

    // Staging world poses for NPC-NPC solid collision
    const poses: { x: number; z: number; yaw: number; r: number; i: number }[] = []

    group.current.children.forEach((child, i) => {
      const lane = LANES[i]
      const sim = sims.current[i]
      if (!lane || !sim) return

      if (isLaneClaimed(i)) {
        // Owned by the parked / abandoned layer now
        child.visible = false
        return
      }

      if (drivenId === i || remoteDriven === i) {
        child.visible = false
        const src = drivenId === i ? flight : remote!
        snaps.push({
          id: i,
          kind: lane.kind,
          x: src.position.x,
          z: src.position.z,
          yaw: src.yaw,
          speed: Math.abs(src.airspeed),
          color: lane.color,
          taken: true,
        })
        return
      }

      // Player crash shove
      const knock = consumeNpcVehicleHit(i)
      if (knock) {
        sim.stun = Math.max(sim.stun, knock.stun)
        sim.speed = Math.max(0, sim.speed - knock.impulse * 0.85)
        if (knock.impulse > 5) sim.speed = 0
        if (lane.axis === 'x') sim.along += knock.dx
        else sim.along += knock.dz
      }

      const want = targets[i] ?? lane.speed
      // Brake hard when yielding
      const rate = want < sim.speed - 0.2 ? 22 : want > sim.speed + 0.2 ? 5.5 : 8
      if (sim.speed < want) sim.speed = Math.min(want, sim.speed + rate * dt)
      else sim.speed = Math.max(want, sim.speed - rate * dt)
      if (sim.speed < 0.08) sim.speed = 0

      const span = lane.max - lane.min
      sim.along += sim.speed * lane.dir * dt
      while (sim.along > lane.max) sim.along -= span
      while (sim.along < lane.min) sim.along += span

      const { x, z, yaw } = laneWorld(lane, sim.along)
      poses.push({ x, z, yaw, r: vehicleRadius(lane.kind), i })
      child.visible = true
      const y =
        roadTunnelFloorY(x, z, getHeight, CITY_STREET_DECK) ??
        getHeight(x, z) + CITY_STREET_DECK
      child.position.set(x, y, z)
      child.rotation.y = yaw
      if (want < 0.5 && sim.speed < 1) child.position.y -= 0.03

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

    // Solid NPC vs NPC (incl. intersections) — separate and brake
    for (let a = 0; a < poses.length; a++) {
      for (let b = a + 1; b < poses.length; b++) {
        const pa = poses[a]!
        const pb = poses[b]!
        let dx = pa.x - pb.x
        let dz = pa.z - pb.z
        let dist = Math.hypot(dx, dz)
        const minD = pa.r + pb.r
        if (dist >= minD || dist < 1e-4) continue
        const nx = dx / dist
        const nz = dz / dist
        const push = (minD - dist) * 0.5
        const sa = sims.current[pa.i]!
        const sb = sims.current[pb.i]!
        const la = LANES[pa.i]!
        const lb = LANES[pb.i]!
        if (la.axis === 'x') sa.along += nx * push
        else sa.along += nz * push
        if (lb.axis === 'x') sb.along -= nx * push
        else sb.along -= nz * push
        sa.speed *= 0.35
        sb.speed *= 0.35
        if (dist < minD * 0.85) {
          sa.stun = Math.max(sa.stun, 0.4)
          sb.stun = Math.max(sb.stun, 0.4)
        }
        // Refresh mesh poses after nudge
        const wa = laneWorld(la, sa.along)
        const wb = laneWorld(lb, sb.along)
        const ca = group.current.children[pa.i]
        const cb = group.current.children[pb.i]
        if (ca) {
          ca.position.set(wa.x, getHeight(wa.x, wa.z) + CITY_STREET_DECK, wa.z)
          ca.rotation.y = wa.yaw
        }
        if (cb) {
          cb.position.set(wb.x, getHeight(wb.x, wb.z) + CITY_STREET_DECK, wb.z)
          cb.rotation.y = wb.yaw
        }
        const snapA = snaps.find((s) => s.id === pa.i)
        const snapB = snaps.find((s) => s.id === pb.i)
        if (snapA) {
          snapA.x = wa.x
          snapA.z = wa.z
          snapA.yaw = wa.yaw
          snapA.speed = sa.speed
        }
        if (snapB) {
          snapB.x = wb.x
          snapB.z = wb.z
          snapB.yaw = wb.yaw
          snapB.speed = sb.speed
        }
      }
    }

    // Parked cars are also solid to NPCs
    for (const p of getLiveParkedVehicles()) {
      if (drivenId === p.id || remoteDriven === p.id) continue
      const pr = vehicleRadius(p.kind)
      for (const pose of poses) {
        const sim = sims.current[pose.i]!
        const lane = LANES[pose.i]!
        let dx = pose.x - p.x
        let dz = pose.z - p.z
        let dist = Math.hypot(dx, dz)
        const minD = pose.r + pr
        if (dist >= minD || dist < 1e-4) continue
        const nx = dx / dist
        const nz = dz / dist
        const push = minD - dist
        if (lane.axis === 'x') sim.along += nx * push
        else sim.along += nz * push
        sim.speed = 0
        sim.stun = Math.max(sim.stun, 0.6)
        const w = laneWorld(lane, sim.along)
        const child = group.current.children[pose.i]
        if (child) {
          const ty =
            roadTunnelFloorY(w.x, w.z, getHeight, CITY_STREET_DECK) ??
            getHeight(w.x, w.z) + CITY_STREET_DECK
          child.position.set(w.x, ty, w.z)
          child.rotation.y = w.yaw
        }
        const snap = snaps.find((s) => s.id === pose.i)
        if (snap) {
          snap.x = w.x
          snap.z = w.z
          snap.speed = 0
        }
        pose.x = w.x
        pose.z = w.z
      }
    }

    setMovingTraffic(snaps)
  })

  return (
    <group ref={group}>
      {LANES.map((lane, i) => (
        <group key={i}>
          <Suspense fallback={null}>
            <VehicleMesh kind={lane.kind} color={lane.color} />
          </Suspense>
        </group>
      ))}
    </group>
  )
}

function ParkedCarsLayer() {
  const group = useRef<THREE.Group>(null)
  const getHeight = BIOME_CONFIGS.city.getHeight
  const [parkedList, setParkedList] = useState(() =>
    getLiveParkedVehicles().map((p) => ({ ...p })),
  )

  useFrame(() => {
    if (!group.current) return
    const live = getLiveParkedVehicles()
    if (
      live.length !== parkedList.length ||
      live.some((p, i) => p.id !== parkedList[i]?.id)
    ) {
      setParkedList(live.map((p) => ({ ...p })))
      return
    }

    const flight = useGameStore.getState().flight
    const remote = useGameStore.getState().remoteFlight
    const drivenId = flight.phase === 'driving' ? flight.vehicleId : -1
    const remoteDriven = remote?.phase === 'driving' ? remote.vehicleId : -1

    const snaps = live.map((spot, i) => {
      const child = group.current!.children[i]
      const isLocal = drivenId === spot.id
      const isRemote = remoteDriven === spot.id

      if (isLocal || isRemote) {
        if (child) child.visible = false
        const src = isLocal ? flight : remote!
        return {
          id: spot.id,
          kind: spot.kind,
          x: src.position.x,
          z: src.position.z,
          yaw: src.yaw,
          speed: Math.abs(src.airspeed),
          color: spot.color,
          taken: true,
          parked: true as const,
        }
      }

      if (child) {
        child.visible = true
        child.position.set(spot.x, getHeight(spot.x, spot.z) + CITY_STREET_DECK, spot.z)
        child.rotation.y = spot.yaw
      }

      return {
        id: spot.id,
        kind: spot.kind,
        x: spot.x,
        z: spot.z,
        yaw: spot.yaw,
        speed: 0,
        color: spot.color,
        taken: false,
        parked: true as const,
      }
    })

    setParkedTraffic(snaps)
  })

  return (
    <group ref={group}>
      {parkedList.map((p) => (
        <group key={p.id}>
          <Suspense fallback={null}>
            <VehicleMesh kind={p.kind} color={p.color} />
          </Suspense>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.4, 2.85, 28]} />
            <meshStandardMaterial
              color="#52b788"
              emissive="#52b788"
              emissiveIntensity={0.4}
              roughness={0.55}
            />
          </mesh>
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
      <ParkedCarsLayer />
      <PedestrianLayer />
      <RooftopPads />
      <TrafficLights />
    </group>
  )
}
