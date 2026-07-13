import { useMemo } from 'react'
import type { BiomeConfig } from '../types/game'
import {
  CliffFace,
  DetailedTerrain,
  HorizonRing,
  LaunchRamp,
  OceanSurface,
  ScatterRocks,
} from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'

interface BeachSceneProps {
  config: BiomeConfig
}

function PalmTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const trunkH = 9.5 + scale * 2.2
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, trunkH * 0.48, 0]}>
        <cylinderGeometry args={[0.22, 0.42, trunkH, 8]} />
        <meshStandardMaterial color="#6b4423" roughness={0.88} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh
          key={i}
          castShadow
          position={[Math.sin(i * 0.85) * 2.2, trunkH + 0.15, Math.cos(i * 0.85) * 2.2]}
          rotation={[0.65, i * 0.85, 0.1]}
        >
          <boxGeometry args={[0.45, 4.8, 0.1]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#2d6a4f' : '#40916c'} roughness={0.72} />
        </mesh>
      ))}
    </group>
  )
}

function DistantIsland({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 5, 0]}>
        <coneGeometry args={[12, 16, 8]} />
        <meshStandardMaterial color="#40916c" roughness={0.82} />
      </mesh>
      <mesh position={[4, 3, 2]} castShadow>
        <coneGeometry args={[6, 10, 7]} />
        <meshStandardMaterial color="#52796f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[14, 15, 1, 14]} />
        <meshStandardMaterial color="#f4d58d" roughness={0.9} />
      </mesh>
    </group>
  )
}

function BeachHut({
  position,
  variant = 0,
}: {
  position: [number, number, number]
  variant?: number
}) {
  const body = variant === 0 ? '#d4a373' : variant === 1 ? '#c98b6a' : '#b08968'
  const roof = variant === 0 ? '#6b4226' : variant === 1 ? '#432818' : '#7f5539'
  const w = 4.2 + variant * 0.4
  const d = 3.6 + (variant % 2) * 0.5
  const wallH = 3.1
  return (
    <group position={position}>
      <mesh castShadow position={[0, wallH * 0.5, 0]}>
        <boxGeometry args={[w, wallH, d]} />
        <meshStandardMaterial color={body} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, wallH + 0.85, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[w * 0.78, 1.9, 4]} />
        <meshStandardMaterial color={roof} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.05, d * 0.505]}>
        <boxGeometry args={[0.95, 2.05, 0.1]} />
        <meshStandardMaterial color="#3d2914" roughness={0.8} />
      </mesh>
      <mesh position={[w * 0.28, 1.7, d * 0.505]}>
        <boxGeometry args={[0.7, 0.7, 0.08]} />
        <meshStandardMaterial color="#90e0ef" roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  )
}

function BeachUmbrella({
  position,
  color = '#e63946',
}: {
  position: [number, number, number]
  color?: string
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.8, 6]} />
        <meshStandardMaterial color="#f1faee" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 2.7, 0]}>
        <coneGeometry args={[1.6, 0.55, 10]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
    </group>
  )
}

function Driftwood({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  return (
    <mesh castShadow position={position} rotation={[0.1, yaw, 0.2]}>
      <capsuleGeometry args={[0.2, 3.2, 4, 6]} />
      <meshStandardMaterial color="#6b4423" roughness={0.95} />
    </mesh>
  )
}

function BeachChair({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[0.55, 0.06, 1.1]} />
        <meshStandardMaterial color="#f4a261" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -0.4]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[0.55, 0.06, 0.7]} />
        <meshStandardMaterial color="#e76f51" roughness={0.7} />
      </mesh>
      <mesh position={[-0.22, 0.2, 0.4]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
        <meshStandardMaterial color="#adb5bd" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.22, 0.2, 0.4]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
        <meshStandardMaterial color="#adb5bd" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Seagull({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#f8f9fa" />
      </mesh>
      <mesh position={[-0.35, 0.02, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.55, 0.04, 0.18]} />
        <meshStandardMaterial color="#dee2e6" />
      </mesh>
      <mesh position={[0.35, 0.02, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.55, 0.04, 0.18]} />
        <meshStandardMaterial color="#dee2e6" />
      </mesh>
    </group>
  )
}

export function BeachScene({ config }: BeachSceneProps) {
  const palms = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => {
        const x = -160 + i * 4.2 + Math.sin(i * 1.7) * 14
        const z = -80 + Math.cos(i * 1.1) * 48 + (i % 5) * 18
        return {
          pos: [x, config.getHeight(x, z), z] as [number, number, number],
          scale: 0.7 + (Math.sin(i * 9) * 0.5 + 0.5) * 0.7,
        }
      }),
    [config],
  )

  const chairs = useMemo(
    () =>
      [
        [26, 64],
        [32, 60],
        [38, 66],
        [18, 72],
        [44, 58],
        [70, 100],
        [85, 110],
        [100, 95],
      ].map(([x, z], i) => ({
        pos: [x, config.getHeight(x, z), z] as [number, number, number],
        yaw: i * 0.4,
      })),
    [config],
  )

  return (
    <>
      <SharedSky config={config} />
      <SharedLighting config={config} />
      <DetailedTerrain config={config} biome="beach" size={2800} segments={220} />
      <HorizonRing color="#c9a227" y={-1} />
      <OceanSurface y={-0.55} />
      <LaunchRamp config={config} />
      {/* Cliff faces west of the launch plateau — match thin collision sheets */}
      <CliffFace position={[-78, 10, -10]} size={[8, 24, 55]} rotation={0.18} />
      <CliffFace position={[-72, 7, 35]} size={[7, 16, 35]} rotation={-0.12} />
      <CliffFace position={[-68, 12, -40]} size={[9, 28, 40]} rotation={0.32} />
      <CliffFace position={[-92, 8, 20]} size={[8, 18, 45]} rotation={0.05} />
      <CliffFace position={[-100, 9, -60]} size={[10, 22, 50]} rotation={0.22} />
      <CliffFace position={[-88, 6, 70]} size={[7, 14, 30]} rotation={-0.08} />
      <ScatterRocks config={config} count={140} area={560} />
      {palms.map((p, i) => (
        <PalmTree key={i} position={p.pos} scale={p.scale} />
      ))}
      <BeachHut position={[20, config.getHeight(20, 55), 55]} variant={0} />
      <BeachHut position={[-10, config.getHeight(-10, 70), 70]} variant={1} />
      <BeachHut position={[55, config.getHeight(55, 95), 95]} variant={2} />
      <BeachHut position={[120, config.getHeight(120, 130), 130]} variant={1} />
      <BeachHut position={[180, config.getHeight(180, 90), 90]} variant={0} />
      <BeachUmbrella position={[28, config.getHeight(28, 62), 62]} color="#e63946" />
      <BeachUmbrella position={[35, config.getHeight(35, 58), 58]} color="#457b9d" />
      <BeachUmbrella position={[12, config.getHeight(12, 78), 78]} color="#f4a261" />
      <BeachUmbrella position={[75, config.getHeight(75, 105), 105]} color="#2a9d8f" />
      <BeachUmbrella position={[95, config.getHeight(95, 88), 88]} color="#e9c46a" />
      {chairs.map((c, i) => (
        <BeachChair key={i} position={c.pos} yaw={c.yaw} />
      ))}
      <Driftwood position={[45, config.getHeight(45, 48) + 0.2, 48]} yaw={0.8} />
      <Driftwood position={[70, config.getHeight(70, 110) + 0.15, 110]} yaw={-0.4} />
      <Driftwood position={[150, config.getHeight(150, 140) + 0.18, 140]} yaw={1.1} />
      <Driftwood position={[200, config.getHeight(200, 70) + 0.12, 70]} yaw={-0.7} />
      <Seagull position={[40, config.getHeight(40, 80) + 18, 80]} />
      <Seagull position={[90, config.getHeight(90, 100) + 22, 100]} />
      <Seagull position={[130, 28, 150]} />
      <Seagull position={[220, 32, 200]} />
      <Seagull position={[280, 26, 160]} />
      <DistantIsland position={[420, -0.5, 520]} scale={1.8} />
      <DistantIsland position={[320, -0.3, 600]} scale={1.2} />
      <DistantIsland position={[560, -0.4, 440]} scale={1.5} />
      <DistantIsland position={[480, -0.2, 680]} scale={1.0} />
      <DistantIsland position={[640, -0.3, 560]} scale={2.0} />
      <DistantIsland position={[700, -0.4, 380]} scale={1.3} />
      <DistantIsland position={[200, -0.3, 720]} scale={1.6} />
    </>
  )
}
