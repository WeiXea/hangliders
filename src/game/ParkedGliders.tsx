import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { useGameStore } from './gameStore'
import { BIOME_CONFIGS } from './biomeConfigs'
import { GliderModel } from './GliderModel'
import { HelicopterModel } from './HelicopterModel'
import { JetModel } from './JetModel'
import { GLIDER_REST_CLEARANCE, HELI_REST_CLEARANCE, JET_REST_CLEARANCE } from './obstacles'
import { MOUNT_RANGE } from '../types/game'
import type { CraftType } from '../types/game'
import {
  elevatorStreetPos,
  elevatorRoofPos,
  getBuildingById,
  sampleCitySupport,
  CITY_STREET_DECK,
} from './cityBuildings'

function craftClearance(craftType?: CraftType) {
  if (craftType === 'helicopter') return HELI_REST_CLEARANCE
  if (craftType === 'jet') return JET_REST_CLEARANCE
  return GLIDER_REST_CLEARANCE
}

function ParkedMarker({
  x,
  z,
  yaw,
  highlight,
  buildingId,
  craftType,
}: {
  x: number
  z: number
  yaw: number
  highlight: boolean
  buildingId?: number
  craftType?: CraftType
}) {
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]
  const support =
    biome === 'city'
      ? sampleCitySupport(x, z, config.getHeight).y
      : config.getHeight(x, z)
  const clearance = craftClearance(craftType)
  const y = support + clearance
  const isHeli = craftType === 'helicopter'
  const isJet = craftType === 'jet'
  const ringInner = isJet ? 5.2 : isHeli ? 4.0 : 3.2
  const ringOuter = isJet ? 5.9 : isHeli ? 4.5 : 3.6
  const ringColor = highlight
    ? '#52b788'
    : isJet
      ? '#ffd60a'
      : isHeli
        ? '#4cc9f0'
        : buildingId != null
          ? '#52b788'
          : '#e9c46a'

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      {isJet ? (
        <JetModel staticModel />
      ) : isHeli ? (
        <HelicopterModel staticModel />
      ) : (
        <GliderModel hidePilot staticModel />
      )}
      <mesh position={[0, isJet ? -0.7 : isHeli ? -0.55 : -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringInner, ringOuter, 32]} />
        <meshStandardMaterial
          color={ringColor}
          transparent
          opacity={highlight ? 0.85 : 0.5}
          emissive={ringColor}
          emissiveIntensity={highlight ? 0.65 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function ElevatorBeacon({
  buildingId,
  getHeight,
  available,
  craftType,
}: {
  buildingId: number
  getHeight: (x: number, z: number) => number
  available: boolean
  craftType: CraftType
}) {
  const b = getBuildingById(buildingId)
  if (!b) return null
  const street = elevatorStreetPos(b, getHeight)
  const roof = elevatorRoofPos(b, getHeight)
  const pulse = useRef(0)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((_, dt) => {
    pulse.current += dt
    if (mat.current) {
      mat.current.emissiveIntensity = 0.35 + Math.sin(pulse.current * 3) * 0.25
    }
  })
  const color =
    craftType === 'helicopter' ? '#4cc9f0' : craftType === 'jet' ? '#ffd60a' : '#52b788'
  const label =
    craftType === 'helicopter'
      ? 'ROOF CHOPPER'
      : craftType === 'jet'
        ? 'ROOF JET'
        : 'ROOF GLIDER'

  return (
    <group>
      <mesh position={[street.x, street.y + 0.08 + CITY_STREET_DECK, street.z]}>
        <boxGeometry args={[2.2, 0.16, 2.2]} />
        <meshStandardMaterial
          ref={mat}
          color={available ? color : '#495057'}
          emissive={available ? color : '#000'}
          emissiveIntensity={available ? 0.5 : 0}
          roughness={0.4}
        />
      </mesh>
      <Text
        position={[street.x, street.y + 2.2 + CITY_STREET_DECK, street.z]}
        fontSize={0.55}
        color={color}
        anchorX="center"
        outlineWidth={0.02}
        outlineColor="#000"
      >
        {label}
      </Text>
      <mesh position={[roof.x, roof.y + 0.06, roof.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.45, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

export function ParkedGliders() {
  const parked = useGameStore((s) => s.parkedGliders)
  const flight = useGameStore((s) => s.flight)
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]

  const nearestId = useMemo(() => {
    if (flight.phase !== 'walking') return -1
    let best = -1
    let bestD = MOUNT_RANGE
    for (const g of parked) {
      if (!g.available) continue
      const d = Math.hypot(g.x - flight.position.x, g.z - flight.position.z)
      if (d >= bestD) continue
      const support =
        biome === 'city'
          ? sampleCitySupport(g.x, g.z, config.getHeight).y
          : config.getHeight(g.x, g.z)
      if (Math.abs(flight.position.y - support) > 4) continue
      bestD = d
      best = g.id
    }
    return best
  }, [parked, flight.phase, flight.position.x, flight.position.z, flight.position.y, biome])

  const elevators = useMemo(() => {
    const map = new Map<number, { available: boolean; craftType: CraftType }>()
    for (const g of parked) {
      if (g.buildingId == null) continue
      const prev = map.get(g.buildingId)
      const craft = g.craftType ?? 'glider'
      map.set(g.buildingId, {
        available: g.available || !!prev?.available,
        craftType:
          craft === 'jet' || prev?.craftType === 'jet'
            ? 'jet'
            : craft === 'helicopter' || prev?.craftType === 'helicopter'
              ? 'helicopter'
              : 'glider',
      })
    }
    return [...map.entries()]
  }, [parked])

  return (
    <group>
      {parked.map(
        (g) =>
          g.available && (
            <ParkedMarker
              key={g.id}
              x={g.x}
              z={g.z}
              yaw={g.yaw}
              highlight={g.id === nearestId}
              buildingId={g.buildingId}
              craftType={g.craftType}
            />
          ),
      )}
      {elevators.map(([id, info]) => (
        <ElevatorBeacon
          key={`el-${id}`}
          buildingId={id}
          getHeight={config.getHeight}
          available={info.available}
          craftType={info.craftType}
        />
      ))}
    </group>
  )
}
