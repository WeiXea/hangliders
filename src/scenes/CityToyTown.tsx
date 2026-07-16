import { useMemo, type ReactElement } from 'react'
import * as THREE from 'three'
import { CITY_BUILDINGS, buildingDepth } from '../game/cityBuildings'

/** Low-poly tree — clumpy green canopy like the Sketchfab city. */
export function ToyTree({
  x,
  z,
  y,
  scale = 1,
}: {
  x: number
  z: number
  y: number
  scale?: number
}) {
  const h = 1.4 * scale
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh castShadow position={[0, h * 0.35, 0]}>
        <cylinderGeometry args={[0.12, 0.18, h * 0.7, 6]} />
        <meshStandardMaterial color="#6b4423" roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0, h * 0.95, 0]}>
        <icosahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial color="#52b788" roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow position={[0.35, h * 1.15, -0.2]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#40916c" roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow position={[-0.3, h * 1.1, 0.25]}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#74c69d" roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

function WindTurbine({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh castShadow position={[0, 7, 0]}>
        <cylinderGeometry args={[0.35, 0.55, 14, 8]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.55} flatShading />
      </mesh>
      <mesh castShadow position={[0, 14.2, 0]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.35, 0.35, 0.9]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.5} flatShading />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          castShadow
          position={[0, 14.2, 0]}
          rotation={[0, 0, (i * Math.PI * 2) / 3]}
        >
          <boxGeometry args={[0.22, 4.8, 0.12]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.5} flatShading />
        </mesh>
      ))}
      {/* Red tips */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`tip-${i}`}
          castShadow
          position={[
            Math.sin((i * Math.PI * 2) / 3) * 2.3,
            14.2 + Math.cos((i * Math.PI * 2) / 3) * 2.3,
            0,
          ]}
          rotation={[0, 0, (i * Math.PI * 2) / 3]}
        >
          <boxGeometry args={[0.24, 0.7, 0.14]} />
          <meshStandardMaterial color="#e63946" roughness={0.55} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function SolarPanel({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, 0.15, 0]}>
      <mesh castShadow position={[0, 0.55, 0]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[2.4, 0.08, 1.5]} />
        <meshStandardMaterial color="#1d3557" metalness={0.45} roughness={0.35} flatShading />
      </mesh>
      <mesh position={[0, 0.25, 0.2]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color="#adb5bd" roughness={0.7} flatShading />
      </mesh>
    </group>
  )
}

function BasketballCourt({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[12, 0.08, 8]} />
        <meshStandardMaterial color="#e63946" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.12, 0.04, 7.6]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.8} flatShading />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * 5.2, 0, 0]}>
          <mesh castShadow position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 2.8, 6]} />
            <meshStandardMaterial color="#495057" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[s * -0.35, 2.6, 0]}>
            <boxGeometry args={[0.9, 0.55, 0.08]} />
            <meshStandardMaterial color="#f8f9fa" roughness={0.6} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function BusStop({ x, z, y, yaw = 0 }: { x: number; z: number; y: number; yaw?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshStandardMaterial color="#4cc9f0" roughness={0.55} flatShading />
      </mesh>
      {([-0.9, 0.9] as const).map((ox) => (
        <mesh key={ox} castShadow position={[ox, 0.55, 0]}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color="#adb5bd" roughness={0.6} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.7, -0.45]}>
        <boxGeometry args={[2.0, 0.9, 0.06]} />
        <meshStandardMaterial color="#e9ecef" transparent opacity={0.45} roughness={0.2} />
      </mesh>
    </group>
  )
}

/** Grass parcel under a building plot — toy-town ground. */
function GrassPad({
  x,
  z,
  y,
  w,
  d,
}: {
  x: number
  z: number
  y: number
  w: number
  d: number
}) {
  return (
    <mesh receiveShadow position={[x, y, z]}>
      <boxGeometry args={[w + 2.4, 0.1, d + 2.4]} />
      <meshStandardMaterial color="#74c69d" roughness={1} flatShading />
    </mesh>
  )
}

/**
 * Sketchfab-style toy-town dressing: grass lots, trees, turbines, solar, court.
 * Keeps gameplay buildings/roads; this is the visual layer that sells the look.
 */
export function CityToyTown({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const trees = useMemo(() => {
    const pts: { x: number; z: number; s: number }[] = []
    // Park belts
    for (let i = 0; i < 18; i++) {
      pts.push({ x: -48 + (i % 6) * 4.5, z: 8 + Math.floor(i / 6) * 5, s: 0.9 + (i % 3) * 0.15 })
    }
    for (let i = 0; i < 22; i++) {
      pts.push({ x: 200 + (i % 7) * 4.2, z: 20 + Math.floor(i / 7) * 5.5, s: 0.85 + (i % 4) * 0.12 })
    }
    // Street trees along sidewalks (offset from road centers)
    const roads = [0, 22, 44, 66, 88, 110, 132, 154]
    for (const rz of roads) {
      for (let x = -30; x <= 210; x += 18) {
        pts.push({ x: x + 3, z: rz + 8.2, s: 0.75 })
        pts.push({ x: x + 9, z: rz - 8.2, s: 0.7 })
      }
    }
    return pts
  }, [])

  const grassPads = useMemo(() => {
    return CITY_BUILDINGS.map((b) => {
      const d = buildingDepth(b)
      return {
        id: b.id,
        x: b.x,
        z: b.z,
        w: b.width,
        d,
        y: getHeight(b.x, b.z) + 0.02,
      }
    })
  }, [getHeight])

  const turbines: ReactElement[] = []
  for (let i = 0; i < 7; i++) {
    const x = -70
    const z = 10 + i * 22
    turbines.push(<WindTurbine key={`wt-${i}`} x={x} z={z} y={getHeight(x, z)} />)
  }

  const panels: ReactElement[] = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const x = 200 + col * 3.2
      const z = 170 + row * 2.4
      panels.push(<SolarPanel key={`sp-${row}-${col}`} x={x} z={z} y={getHeight(x, z)} />)
    }
  }

  return (
    <group>
      {/* Downtown green carpet — flat toy ground under the grid */}
      <mesh receiveShadow position={[90, getHeight(90, 90) - 0.02, 90]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[320, 260]} />
        <meshStandardMaterial color="#8fd19e" roughness={1} flatShading />
      </mesh>

      {grassPads.map((p) => (
        <GrassPad key={`g-${p.id}`} x={p.x} z={p.z} y={p.y} w={p.w} d={p.d} />
      ))}

      {trees.map((t, i) => (
        <ToyTree key={`t-${i}`} x={t.x} z={t.z} y={getHeight(t.x, t.z)} scale={t.s} />
      ))}

      {turbines}
      {panels}
      <BasketballCourt x={-35} z={130} y={getHeight(-35, 130) + 0.05} />
      <BusStop x={30} z={14} y={getHeight(30, 14)} yaw={0} />
      <BusStop x={70} z={58} y={getHeight(70, 58)} yaw={Math.PI / 2} />
      <BusStop x={120} z={80} y={getHeight(120, 80)} yaw={0} />
      <BusStop x={50} z={124} y={getHeight(50, 124)} yaw={Math.PI / 2} />

      {/* Curved blue warehouse roofs — iconic toy-town landmark */}
      <group position={[210, getHeight(210, 40), 40]}>
        <mesh castShadow position={[0, 2.2, 0]}>
          <boxGeometry args={[18, 4.4, 12]} />
          <meshStandardMaterial color="#f1faee" roughness={0.85} flatShading />
        </mesh>
        <mesh castShadow position={[0, 4.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[6.2, 6.2, 18, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#4cc9f0" roughness={0.7} flatShading side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}
