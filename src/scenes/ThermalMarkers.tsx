import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { getThermals, thermalCenter } from '../game/atmosphere'

function ThermalColumn({
  index,
  radius,
  y0,
  y1,
  strength,
}: {
  index: number
  radius: number
  y0: number
  y1: number
  strength: number
}) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const column = useRef<THREE.Mesh>(null)
  const height = Math.max(28, y1 - y0)
  const opacity = 0.08 + Math.min(0.1, strength * 0.018)

  useFrame(({ clock }) => {
    const store = useGameStore.getState()
    const th = getThermals(store.biome)[index]
    if (!th || !group.current) return
    const { cx, cz } = thermalCenter(th, store.simTime)
    const gy = BIOME_CONFIGS[store.biome].getHeight(cx, cz)
    group.current.position.set(cx, 0, cz)

    const t = clock.elapsedTime
    if (ring.current) {
      ring.current.position.y = gy + 0.45
      const mat = ring.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * 1.5 + Math.sin(t * 1.6 + index) * 0.04
      const s = 1 + Math.sin(t * 0.9 + index) * 0.05
      ring.current.scale.setScalar(s)
    }
    if (column.current) {
      const midY = Math.max(y0, gy + 6) + height * 0.28
      column.current.position.y = midY
      const mat = column.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity + Math.sin(t * 1.15 + index * 0.7) * 0.03
    }
  })

  return (
    <group ref={group}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.3, radius * 0.75, 48]} />
        <meshBasicMaterial
          color="#7dd3a0"
          transparent
          opacity={opacity * 1.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={column}>
        <cylinderGeometry args={[radius * 0.2, radius * 0.52, height * 0.65, 18, 1, true]} />
        <meshBasicMaterial
          color="#9ae6b4"
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/** Soft visual markers for thermal cores — readable, cheap for PWA. */
export function ThermalMarkers() {
  const biome = useGameStore((s) => s.biome)
  const thermals = useMemo(() => getThermals(biome), [biome])

  return (
    <group>
      {thermals.map((th, i) => (
        <ThermalColumn
          key={`${biome}-${i}`}
          index={i}
          radius={th.radius}
          y0={th.y0}
          y1={th.y1}
          strength={th.strength}
        />
      ))}
    </group>
  )
}
