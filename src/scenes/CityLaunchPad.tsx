import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { ROCKET_PAD, ROCKET_TOWER, rocketPadDeckY } from '../game/rocketPad'
import { getSpaceXLogoTexture } from '../game/vehicleSurfaces'

function LogoPanel({
  position,
  rotation,
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  const tex = useMemo(() => getSpaceXLogoTexture(), [])
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]} scale={scale}>
      <planeGeometry args={[4, 1.1]} />
      <meshStandardMaterial map={tex} transparent roughness={0.4} metalness={0.2} />
    </mesh>
  )
}

function CatwalkRail({ from, to, y }: { from: [number, number, number]; to: [number, number, number]; y: number }) {
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, y, (from[2] + to[2]) / 2]
  const len = Math.hypot(to[0] - from[0], to[2] - from[2])
  const yaw = Math.atan2(to[0] - from[0], to[2] - from[2])
  return (
    <group position={mid} rotation={[0, yaw, 0]}>
      <mesh castShadow position={[-1.35, 0.55, 0]}>
        <boxGeometry args={[0.08, 1.1, len]} />
        <meshStandardMaterial color="#ffd60a" metalness={0.45} roughness={0.4} emissive="#ffd60a" emissiveIntensity={0.15} />
      </mesh>
      <mesh castShadow position={[1.35, 0.55, 0]}>
        <boxGeometry args={[0.08, 1.1, len]} />
        <meshStandardMaterial color="#ffd60a" metalness={0.45} roughness={0.4} emissive="#ffd60a" emissiveIntensity={0.15} />
      </mesh>
      {/* Knee rails */}
      {Array.from({ length: Math.floor(len / 4) + 1 }, (_, i) => (
        <mesh key={i} position={[0, 0.25, -len / 2 + i * 4]}>
          <boxGeometry args={[2.8, 0.06, 0.06]} />
          <meshStandardMaterial color="#adb5bd" metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

/** Starbase-style pad — flame trench, strongback, floodlights. */
export function CityLaunchPad() {
  const getHeight = BIOME_CONFIGS.city.getHeight
  const deckY = rocketPadDeckY(getHeight(ROCKET_PAD.x, ROCKET_PAD.z))

  return (
    <group position={[ROCKET_PAD.x, deckY, ROCKET_PAD.z]}>
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[16, 16, 0.14, 8]} />
        <meshStandardMaterial color="#3a4046" roughness={0.85} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <ringGeometry args={[5.5, 15.5, 8]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[7, 2.8, 12]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 14, -2]}>
        <boxGeometry args={[0.4, 28, 0.4]} />
        <meshStandardMaterial color="#ced4da" metalness={0.65} roughness={0.32} />
      </mesh>
      <LogoPanel position={[0, 10, 2.6]} scale={1.3} />
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * 14, 0, 10]}>
          <mesh castShadow position={[0, 5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 10, 8]} />
            <meshStandardMaterial color="#212529" metalness={0.6} roughness={0.4} />
          </mesh>
          <spotLight
            position={[0, 10, 0]}
            angle={0.5}
            penumbra={0.35}
            intensity={3}
            color="#fff3bf"
            castShadow
          />
        </group>
      ))}
    </group>
  )
}

/** Crew access tower, elevator, and catwalk bridge to the rocket. */
export function RocketTower({ elevatorY }: { elevatorY?: number }) {
  const getHeight = BIOME_CONFIGS.city.getHeight
  const padGy = getHeight(ROCKET_PAD.x, ROCKET_PAD.z)
  const baseY = rocketPadDeckY(padGy)
  const deckH = ROCKET_TOWER.topY
  const carLocalY = (elevatorY ?? baseY + 1.4) - baseY

  const towerPos: [number, number, number] = [ROCKET_TOWER.baseX, baseY, ROCKET_TOWER.baseZ]
  const catwalkEnd: [number, number, number] = [ROCKET_PAD.x + 6, baseY + deckH, ROCKET_TOWER.baseZ]
  const catwalkStart: [number, number, number] = [ROCKET_TOWER.baseX + 4, baseY + deckH, ROCKET_TOWER.baseZ]

  return (
    <group>
      <group position={towerPos}>
        {/* Open truss tower — four columns */}
        {([[-1.6, -1.6], [-1.6, 1.6], [1.6, -1.6], [1.6, 1.6]] as const).map(([ox, oz], i) => (
          <mesh key={i} castShadow position={[ox, deckH * 0.5, oz]}>
            <boxGeometry args={[0.45, deckH, 0.45]} />
            <meshStandardMaterial color="#5c6770" metalness={0.55} roughness={0.42} />
          </mesh>
        ))}
        {/* Cross braces */}
        {[8, 18, 28].map((h) => (
          <group key={h} position={[0, h, 0]}>
            <mesh castShadow position={[0, 0, 0]}>
              <boxGeometry args={[3.6, 0.28, 0.28]} />
              <meshStandardMaterial color="#6c757d" metalness={0.5} roughness={0.45} />
            </mesh>
            <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[3.6, 0.28, 0.28]} />
              <meshStandardMaterial color="#6c757d" metalness={0.5} roughness={0.45} />
            </mesh>
          </group>
        ))}
        {/* Top platform deck */}
        <mesh castShadow receiveShadow position={[0, deckH, 0]}>
          <boxGeometry args={[8, 0.45, 8]} />
          <meshStandardMaterial color="#868e96" metalness={0.55} roughness={0.38} />
        </mesh>
        <mesh receiveShadow position={[0, deckH + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7.2, 7.2]} />
          <meshStandardMaterial color="#495057" roughness={0.75} metalness={0.35} />
        </mesh>
        {/* Elevator car */}
        <mesh castShadow position={[0, carLocalY, 0]}>
          <boxGeometry args={[2.6, 3, 2.6]} />
          <meshStandardMaterial color="#dee2e6" metalness={0.55} roughness={0.32} />
        </mesh>
        <mesh position={[0, carLocalY, 1.35]}>
          <boxGeometry args={[2.2, 2.4, 0.08]} />
          <meshStandardMaterial color="#74c0fc" transparent opacity={0.45} metalness={0.6} roughness={0.15} />
        </mesh>
        <LogoPanel position={[0, deckH - 3, 2.2]} />
        <Text position={[0, deckH + 2, 0]} fontSize={0.65} color="#ffd60a" anchorX="center" outlineWidth={0.03} outlineColor="#000">
          CREW TOWER
        </Text>
      </group>

      {/* Catwalk bridge to rocket */}
      <group>
        {(() => {
          const midX = (catwalkStart[0] + catwalkEnd[0]) / 2
          const len = catwalkEnd[0] - catwalkStart[0]
          return (
            <>
              <mesh castShadow receiveShadow position={[midX, baseY + deckH, ROCKET_TOWER.baseZ]}>
                <boxGeometry args={[len, 0.4, 3.2]} />
                <meshStandardMaterial color="#7a8288" metalness={0.58} roughness={0.35} />
              </mesh>
              {/* Grate stripes */}
              {Array.from({ length: Math.floor(len / 1.8) }, (_, i) => (
                <mesh
                  key={i}
                  position={[catwalkStart[0] + i * 1.8 + 0.9, baseY + deckH + 0.04, ROCKET_TOWER.baseZ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[1.2, 2.8]} />
                  <meshStandardMaterial color="#495057" roughness={0.8} metalness={0.4} />
                </mesh>
              ))}
              <CatwalkRail from={catwalkStart} to={catwalkEnd} y={baseY + deckH} />
              <Text
                position={[midX, baseY + deckH + 2.2, ROCKET_TOWER.baseZ + 2]}
                fontSize={0.5}
                color="#ffd60a"
                anchorX="center"
                rotation={[0, 0, 0]}
              >
                CATWALK → HATCH
              </Text>
            </>
          )
        })()}
      </group>
    </group>
  )
}

/** Animated plume — Y-up rocket, exhaust at base. */
export function RocketPlume({ power = 0 }: { power?: number }) {
  const ref = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff8c42',
        emissive: '#ff5500',
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.75,
      }),
    [],
  )
  useFrame((state) => {
    ref.emissiveIntensity = 0.85 + power * 1.4 + Math.sin(state.clock.elapsedTime * 26) * 0.12
    ref.opacity = 0.55 + power * 0.35
  })
  if (power < 0.05) return null
  const h = 8 + power * 18
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -h * 0.45, 0]} scale={[1.2 + power * 0.5, h, 1.2 + power * 0.5]}>
        <coneGeometry args={[1.4, 1, 16]} />
        <primitive object={ref} attach="material" />
      </mesh>
      <pointLight position={[0, -2, 0]} intensity={power * 8} color="#ff6b35" distance={40} decay={2} />
    </group>
  )
}
