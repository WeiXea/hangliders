import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { listRidgeMarkers } from '../game/atmosphere'

/** Faint chevrons on windward slopes — ridge lift cues. */
export function RidgeLiftMarkers() {
  const biome = useGameStore((s) => s.biome)
  const config = BIOME_CONFIGS[biome]
  const markers = useMemo(() => listRidgeMarkers(config), [biome, config])

  if (markers.length === 0) return null

  return (
    <group>
      {markers.map((m, i) => (
        <group key={i} position={[m.x, m.y, m.z]} rotation={[0, m.facing, 0]}>
          <mesh position={[0, 0, 0]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[1.6, 3.2, 3]} />
            <meshBasicMaterial
              color="#a8dadc"
              transparent
              opacity={0.22}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 2.8, -1.2]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[1.2, 2.4, 3]} />
            <meshBasicMaterial
              color="#caf0f8"
              transparent
              opacity={0.16}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
