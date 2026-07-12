import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { BIOME_CONFIGS } from './biomeConfigs'
import { GliderModel } from './GliderModel'
import { GROUND_CLEARANCE } from './obstacles'
import { MOUNT_RANGE } from '../types/game'

function ParkedMarker({
  x,
  z,
  yaw,
  highlight,
  getHeight,
}: {
  x: number
  z: number
  yaw: number
  highlight: boolean
  getHeight: (x: number, z: number) => number
}) {
  const y = getHeight(x, z) + GROUND_CLEARANCE
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <GliderModel hidePilot staticModel />
      {/* Soft beacon so walkers can spot mounts */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.6, 32]} />
        <meshStandardMaterial
          color={highlight ? '#52b788' : '#e9c46a'}
          transparent
          opacity={highlight ? 0.85 : 0.45}
          emissive={highlight ? '#52b788' : '#e9c46a'}
          emissiveIntensity={highlight ? 0.6 : 0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export function ParkedGliders() {
  const parked = useGameStore((s) => s.parkedGliders)
  const biome = useGameStore((s) => s.biome)
  const flight = useGameStore((s) => s.flight)
  const config = BIOME_CONFIGS[biome]

  const nearestId = useMemo(() => {
    if (flight.phase !== 'walking') return -1
    let best = -1
    let bestD = MOUNT_RANGE
    for (const g of parked) {
      if (!g.available) continue
      const d = Math.hypot(g.x - flight.position.x, g.z - flight.position.z)
      if (d < bestD) {
        bestD = d
        best = g.id
      }
    }
    return best
  }, [parked, flight.phase, flight.position.x, flight.position.z])

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
            getHeight={config.getHeight}
          />
        ))}
    </>
  )
}
