import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { useGameStore } from './gameStore'
import { BIOME_CONFIGS } from './biomeConfigs'
import { GliderModel } from './GliderModel'
import { HelicopterModel } from './HelicopterModel'
import { GLIDER_REST_CLEARANCE, HELI_REST_CLEARANCE } from './obstacles'
import { MOUNT_RANGE } from '../types/game'
import {
  elevatorStreetPos,
  elevatorRoofPos,
  getBuildingById,
  sampleCitySupport,
  CITY_STREET_DECK,
} from './cityBuildings'

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
  craftType?: 'glider' | 'helicopter'
}) {
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]
  const support =
    biome === 'city'
      ? sampleCitySupport(x, z, config.getHeight).y
      : config.getHeight(x, z)
  const clearance = craftType === 'helicopter' ? HELI_REST_CLEARANCE : GLIDER_REST_CLEARANCE
  const y = support + clearance
  const isHeli = craftType === 'helicopter'

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      {isHeli ? <HelicopterModel staticModel /> : <GliderModel hidePilot staticModel />}
      <mesh position={[0, isHeli ? -0.55 : -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[isHeli ? 4.0 : 3.2, isHeli ? 4.5 : 3.6, 32]} />
        <meshStandardMaterial
          color={highlight ? '#52b788' : isHeli ? '#4cc9f0' : buildingId != null ? '#52b788' : '#e9c46a'}
          transparent
          opacity={highlight ? 0.85 : 0.5}
          emissive={highlight ? '#52b788' : isHeli ? '#4cc9f0' : buildingId != null ? '#52b788' : '#e9c46a'}
          emissiveIntensity={highlight ? 0.65 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function ElevatorBeacon({
  buildingId,
  available,
  craftType,
}: {
  buildingId: number
  available: boolean
  craftType: 'glider' | 'helicopter'
}) {
  const getHeight = BIOME_CONFIGS.city.getHeight
  const lightRef = useRef<THREE.MeshStandardMaterial>(null)
  const b = getBuildingById(buildingId)

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 3.2) * 0.35
    }
  })

  if (!b || !available) return null

  const street = elevatorStreetPos(b, getHeight)
  const roof = elevatorRoofPos(b, getHeight)
  const color = craftType === 'helicopter' ? '#4cc9f0' : '#52b788'
  const label = craftType === 'helicopter' ? 'ROOF CHOPPER' : 'ROOF GLIDER'

  return (
    <>
      <group position={[street.x, street.y + CITY_STREET_DECK, street.z]}>
        <mesh castShadow position={[0, 1.35, 0]}>
          <boxGeometry args={[1.35, 2.7, 0.55]} />
          <meshStandardMaterial color="#212529" metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.5, 0.3]}>
          <boxGeometry args={[0.95, 2.0, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 2.55, 0.32]}>
          <circleGeometry args={[0.18, 16]} />
          <meshStandardMaterial
            ref={lightRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
          />
        </mesh>
        <mesh position={[0, 0.04, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.35, 28]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.55}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Text
          position={[0, 3.15, 0.2]}
          fontSize={0.26}
          color="#f8f9fa"
          anchorX="center"
          outlineWidth={0.015}
          outlineColor="#0b1f14"
        >
          {label}
        </Text>
        <pointLight position={[0, 2.4, 0.6]} intensity={0.7} distance={8} color={color} />
      </group>

      <group position={[roof.x, roof.y + 0.05, roof.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1, 20]} />
          <meshStandardMaterial color="#212529" roughness={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.75, 1.05, 20]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.55, 1.1, 0.55]} />
          <meshStandardMaterial color="#343a40" metalness={0.4} />
        </mesh>
      </group>
    </>
  )
}

export function ParkedGliders() {
  const parked = useGameStore((s) => s.parkedGliders)
  const biome = useGameStore((s) => s.biome)
  const flight = useGameStore((s) => s.flight)

  const nearestId = useMemo(() => {
    if (flight.phase !== 'walking') return -1
    let best = -1
    let bestD = MOUNT_RANGE
    for (const g of parked) {
      if (!g.available) continue
      const d = Math.hypot(g.x - flight.position.x, g.z - flight.position.z)
      const support =
        biome === 'city'
          ? sampleCitySupport(g.x, g.z, BIOME_CONFIGS.city.getHeight).y
          : BIOME_CONFIGS[biome].getHeight(g.x, g.z)
      if (Math.abs(flight.position.y - support) > 4) continue
      if (d < bestD) {
        bestD = d
        best = g.id
      }
    }
    return best
  }, [parked, flight.phase, flight.position.x, flight.position.z, flight.position.y, biome])

  const elevators = useMemo(() => {
    const map = new Map<number, { available: boolean; craftType: 'glider' | 'helicopter' }>()
    for (const g of parked) {
      if (g.buildingId == null) continue
      const prev = map.get(g.buildingId)
      const craft = g.craftType ?? 'glider'
      map.set(g.buildingId, {
        available: (prev?.available ?? false) || g.available,
        craftType: craft === 'helicopter' || prev?.craftType === 'helicopter' ? 'helicopter' : 'glider',
      })
    }
    return [...map.entries()]
  }, [parked])

  return (
    <>
      {parked
        .filter((g) => g.available)
        .map((g) => (
          <ParkedMarker
            key={g.id}
            x={g.x}
            z={g.z}
            yaw={g.yaw}
            highlight={g.id === nearestId}
            buildingId={g.buildingId}
            craftType={g.craftType}
          />
        ))}
      {biome === 'city' &&
        elevators.map(([buildingId, info]) => (
          <ElevatorBeacon
            key={buildingId}
            buildingId={buildingId}
            available={info.available}
            craftType={info.craftType}
          />
        ))}
    </>
  )
}
