import { useMemo } from 'react'
import type { BiomeConfig } from '../types/game'
import { DetailedTerrain, HorizonRing, LaunchRamp, ScatterRocks } from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'
import { MOUNTAIN_SCENERY } from '../game/obstacles'

interface MountainSceneProps {
  config: BiomeConfig
}

function PineTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 3.5, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 4.2, 0]}>
        <coneGeometry args={[1.4, 3, 7]} />
        <meshStandardMaterial color="#1b4332" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 6, 0]}>
        <coneGeometry args={[1.05, 2.4, 7]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.82} />
      </mesh>
    </group>
  )
}

/** Tall vertical rock pillar — crash if you fly into it */
function RockPillar({
  x,
  z,
  radius,
  height,
  groundY,
}: {
  x: number
  z: number
  radius: number
  height: number
  groundY: number
}) {
  return (
    <group position={[x, groundY, z]}>
      <mesh castShadow receiveShadow position={[0, height * 0.45, 0]}>
        <cylinderGeometry args={[radius * 0.85, radius, height * 0.9, 8]} />
        <meshStandardMaterial color="#6c757d" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, height * 0.92, 0]}>
        <coneGeometry args={[radius * 0.7, height * 0.25, 6]} />
        <meshStandardMaterial color="#adb5bd" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, height + 0.5, 0]}>
        <coneGeometry args={[radius * 0.35, 2.5, 5]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.95} />
      </mesh>
    </group>
  )
}

function Cabin({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[4, 2.4, 3.2]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, 2.9, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.2, 1.8, 4]} />
        <meshStandardMaterial color="#495057" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.1, 1.65]}>
        <boxGeometry args={[0.7, 1.1, 0.08]} />
        <meshStandardMaterial color="#343a40" />
      </mesh>
    </group>
  )
}

function SnowPatch({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <circleGeometry args={[3.5, 10]} />
      <meshStandardMaterial color="#f8f9fa" roughness={0.95} transparent opacity={0.85} />
    </mesh>
  )
}

export function MountainScene({ config }: MountainSceneProps) {
  const trees = useMemo(() => {
    const list: { pos: [number, number, number]; scale: number }[] = []
    for (let i = 0; i < 120; i++) {
      const x = (Math.sin(i * 73.1) * 0.5 + 0.5) * 380 - 100
      const z = (Math.cos(i * 41.9) * 0.5 + 0.5) * 360 - 50
      const y = config.getHeight(x, z)
      const nearPillar = MOUNTAIN_SCENERY.some(
        (o) => Math.hypot(o.x - x, o.z - z) < o.radius + 8,
      )
      if (y > 10 && y < 55 && !nearPillar) {
        list.push({
          pos: [x, y, z],
          scale: 0.65 + (Math.sin(i * 17) * 0.5 + 0.5) * 0.9,
        })
      }
    }
    return list
  }, [config])

  const snow = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const x = 40 + i * 12 + Math.sin(i) * 8
        const z = 30 + (i % 7) * 18
        const y = config.getHeight(x, z)
        return { pos: [x, y + 0.12, z] as [number, number, number], scale: 0.6 + (i % 4) * 0.25 }
      }).filter((s) => config.getHeight(s.pos[0], s.pos[2]) > 40),
    [config],
  )

  return (
    <>
      <SharedSky config={config} />
      <SharedLighting config={config} />
      <DetailedTerrain config={config} biome="mountains" segments={140} />
      <HorizonRing color="#6b8e4e" y={2} />
      <LaunchRamp config={config} />
      <ScatterRocks config={config} count={80} area={360} />
      {MOUNTAIN_SCENERY.map((o, i) => (
        <RockPillar
          key={i}
          x={o.x}
          z={o.z}
          radius={o.radius}
          height={o.height}
          groundY={config.getHeight(o.x, o.z)}
        />
      ))}
      {trees.map((t, i) => (
        <PineTree key={i} position={t.pos} scale={t.scale} />
      ))}
      {snow.map((s, i) => (
        <SnowPatch key={i} position={s.pos} scale={s.scale} />
      ))}
      <Cabin position={[55, config.getHeight(55, 70), 70]} />
      <Cabin position={[160, config.getHeight(160, 50), 50]} />
    </>
  )
}
