import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'

export function XCTurnpoints() {
  const mode = useGameStore((s) => s.mode)
  const task = useGameStore((s) => s.xcTask)
  const biome = useGameStore((s) => s.biome)

  if (mode !== 'xc' || !task) return null
  const config = BIOME_CONFIGS[biome]

  return (
    <group>
      {task.turnpoints.map((tp, i) => {
        const active = i === task.nextIndex
        const done = tp.tagged
        const gy = config.getHeight(tp.position.x, tp.position.z)
        return (
          <TurnCylinder
            key={tp.id}
            x={tp.position.x}
            z={tp.position.z}
            y0={gy}
            y1={tp.position.y + 20}
            radius={tp.radius}
            active={active}
            done={done}
            label={tp.name}
          />
        )
      })}
      <TurnCylinder
        x={task.goal.position.x}
        z={task.goal.position.z}
        y0={config.getHeight(task.goal.position.x, task.goal.position.z)}
        y1={task.goal.position.y + 16}
        radius={task.goal.radius}
        active={task.nextIndex >= task.turnpoints.length && !task.completed}
        done={task.completed}
        label="GOAL"
        goal
      />
    </group>
  )
}

function TurnCylinder({
  x,
  z,
  y0,
  y1,
  radius,
  active,
  done,
  label,
  goal,
}: {
  x: number
  z: number
  y0: number
  y1: number
  radius: number
  active: boolean
  done: boolean
  label: string
  goal?: boolean
}) {
  const ring = useRef<THREE.Mesh>(null)
  const h = Math.max(12, y1 - y0)
  const color = done ? '#52b788' : active ? (goal ? '#ffd166' : '#4cc9f0') : '#6c757d'

  useFrame(({ clock }) => {
    if (!ring.current || !active || done) return
    const mat = ring.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.22 + Math.sin(clock.elapsedTime * 2.4) * 0.08
  })

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, y0 + h * 0.45, 0]}>
        <cylinderGeometry args={[radius, radius, h * 0.9, 28, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={done ? 0.1 : active ? 0.18 : 0.06}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, y0 + 0.5, 0]}>
        <ringGeometry args={[radius * 0.85, radius, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.35 : 0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Simple label plane */}
      <mesh position={[0, y0 + h * 0.85, 0]}>
        <planeGeometry args={[label.length * 1.1, 2.2]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  )
}
