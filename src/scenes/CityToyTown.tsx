import { useMemo, useRef, useLayoutEffect, type ReactElement } from 'react'
import * as THREE from 'three'
import { CITY_BUILDINGS, buildingDepth } from '../game/cityBuildings'
import { ToyVehicleMesh } from '../game/ToyVehicleModels'

function WindTurbine({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 7, 0]}>
        <cylinderGeometry args={[0.35, 0.55, 14, 8]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.55} flatShading />
      </mesh>
      <mesh position={[0, 14.2, 0]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.35, 0.35, 0.9]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.5} flatShading />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 14.2, 0]} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
          <boxGeometry args={[0.22, 4.8, 0.12]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.5} flatShading />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`tip-${i}`}
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
      <mesh position={[0, 0.55, 0]} rotation={[-0.45, 0, 0]}>
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
          <mesh position={[0, 1.4, 0]}>
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
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshStandardMaterial color="#4cc9f0" roughness={0.55} flatShading />
      </mesh>
      {([-0.9, 0.9] as const).map((ox) => (
        <mesh key={ox} position={[ox, 0.55, 0]}>
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

function ParkingLot({
  x,
  z,
  y,
  w,
  d,
  yaw = 0,
  stalls,
}: {
  x: number
  z: number
  y: number
  w: number
  d: number
  yaw?: number
  stalls: number
}) {
  const colors = ['#e63946', '#457b9d', '#ffd60a', '#f8f9fa', '#2a9d8f', '#bc4749']
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#495057" roughness={0.95} flatShading />
      </mesh>
      {Array.from({ length: stalls }).map((_, i) => {
        const ox = -w * 0.5 + 1.4 + i * (w / stalls)
        return (
          <group key={i}>
            <mesh position={[ox, 0.1, 0]}>
              <boxGeometry args={[0.08, 0.02, d * 0.85]} />
              <meshStandardMaterial color="#f8f9fa" roughness={0.8} flatShading />
            </mesh>
            <group position={[ox + w / stalls / 2 - 0.35, 0.08, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.85}>
              <ToyVehicleMesh kind="car" color={colors[i % colors.length]} />
            </group>
          </group>
        )
      })}
    </group>
  )
}

function Hydrant({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.7, 6]} />
        <meshStandardMaterial color="#e63946" roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.16, 6, 4]} />
        <meshStandardMaterial color="#c1121f" roughness={0.7} flatShading />
      </mesh>
    </group>
  )
}

function TrafficLight({ x, z, y, yaw = 0 }: { x: number; z: number; y: number; yaw?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 3.6, 6]} />
        <meshStandardMaterial color="#212529" roughness={0.6} flatShading />
      </mesh>
      <mesh position={[0.55, 3.5, 0]}>
        <boxGeometry args={[0.35, 0.95, 0.28]} />
        <meshStandardMaterial color="#212529" roughness={0.55} flatShading />
      </mesh>
      {[0.28, 0, -0.28].map((oy, i) => (
        <mesh key={i} position={[0.72, 3.5 + oy, 0]}>
          <sphereGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial
            color={i === 0 ? '#e63946' : i === 1 ? '#ffd60a' : '#52b788'}
            emissive={i === 0 ? '#e63946' : i === 1 ? '#ffd60a' : '#52b788'}
            emissiveIntensity={0.55}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

function TrashBin({ x, z, y, color = '#2a9d8f' }: { x: number; z: number; y: number; color?: string }) {
  return (
    <mesh position={[x, y + 0.35, z]}>
      <cylinderGeometry args={[0.22, 0.26, 0.7, 6]} />
      <meshStandardMaterial color={color} roughness={0.75} flatShading />
    </mesh>
  )
}

function CrateStack({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      {[0, 0.55, 1.1].map((oy, i) => (
        <mesh key={i} position={[(i % 2) * 0.15, oy + 0.25, (i % 3) * 0.1]}>
          <boxGeometry args={[0.9, 0.5, 0.7]} />
          <meshStandardMaterial color={i % 2 ? '#e76f51' : '#f4a261'} roughness={0.85} flatShading />
        </mesh>
      ))}
      <mesh position={[1.4, 0.35, 0.2]}>
        <cylinderGeometry args={[0.28, 0.28, 0.7, 8]} />
        <meshStandardMaterial color="#ffd60a" roughness={0.7} flatShading />
      </mesh>
    </group>
  )
}

function ChargingCanopy({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      {([-2.2, 2.2] as const).map((ox) => (
        <mesh key={ox} position={[ox, 1.6, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 3.2, 6]} />
          <meshStandardMaterial color="#adb5bd" roughness={0.6} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 3.3, 0]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[6.5, 0.12, 4]} />
        <meshStandardMaterial color="#1d3557" roughness={0.4} metalness={0.35} flatShading />
      </mesh>
      <mesh position={[0, 1.1, 1.4]}>
        <boxGeometry args={[1.2, 1.6, 0.4]} />
        <meshStandardMaterial color="#4cc9f0" roughness={0.55} flatShading />
      </mesh>
    </group>
  )
}

/** Instanced tree canopy blobs — one draw call for the whole grove. */
function InstancedTreeCanopies({
  points,
  getHeight,
}: {
  points: { x: number; z: number; s: number }[]
  getHeight: (x: number, z: number) => number
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    if (!mesh.current) return
    points.forEach((p, i) => {
      const y = getHeight(p.x, p.z) + 1.35 * p.s
      dummy.position.set(p.x, y, p.z)
      dummy.scale.setScalar(0.85 * p.s)
      dummy.updateMatrix()
      mesh.current!.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }, [points, getHeight, dummy])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, points.length]} frustumCulled={false}>
      <icosahedronGeometry args={[0.95, 0]} />
      <meshStandardMaterial color="#52b788" roughness={0.95} flatShading />
    </instancedMesh>
  )
}

function InstancedTreeTrunks({
  points,
  getHeight,
}: {
  points: { x: number; z: number; s: number }[]
  getHeight: (x: number, z: number) => number
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    if (!mesh.current) return
    points.forEach((p, i) => {
      const y = getHeight(p.x, p.z) + 0.55 * p.s
      dummy.position.set(p.x, y, p.z)
      dummy.scale.set(p.s, p.s, p.s)
      dummy.updateMatrix()
      mesh.current!.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }, [points, getHeight, dummy])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, points.length]} frustumCulled={false}>
      <cylinderGeometry args={[0.12, 0.18, 1.1, 5]} />
      <meshStandardMaterial color="#6b4423" roughness={1} flatShading />
    </instancedMesh>
  )
}

/**
 * Sketchfab-style toy-town dressing: grass, instanced trees, parking, street props.
 */
export function CityToyTown({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const trees = useMemo(() => {
    const pts: { x: number; z: number; s: number }[] = []
    // Dense perimeter groves
    for (let i = 0; i < 28; i++) {
      pts.push({ x: -52 + (i % 7) * 3.8, z: 4 + Math.floor(i / 7) * 4.2, s: 0.95 + (i % 3) * 0.1 })
    }
    for (let i = 0; i < 24; i++) {
      pts.push({ x: 205 + (i % 6) * 3.6, z: 16 + Math.floor(i / 6) * 4.5, s: 0.9 + (i % 4) * 0.1 })
    }
    for (let i = 0; i < 20; i++) {
      pts.push({ x: 40 + (i % 10) * 12, z: -8 + (i % 2) * 3, s: 0.8 })
    }
    // Lighter street trees (not every sidewalk post)
    const roads = [0, 44, 88, 132]
    for (const rz of roads) {
      for (let x = -20; x <= 200; x += 28) {
        pts.push({ x: x + 4, z: rz + 8.2, s: 0.72 })
        pts.push({ x: x + 14, z: rz - 8.2, s: 0.68 })
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
  for (let i = 0; i < 6; i++) {
    const x = -70
    const z = 10 + i * 24
    turbines.push(<WindTurbine key={`wt-${i}`} x={x} z={z} y={getHeight(x, z)} />)
  }

  const panels: ReactElement[] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 205 + col * 3.4
      const z = 175 + row * 2.6
      panels.push(<SolarPanel key={`sp-${row}-${col}`} x={x} z={z} y={getHeight(x, z)} />)
    }
  }

  return (
    <group>
      <mesh receiveShadow position={[90, getHeight(90, 90) - 0.02, 90]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[320, 260]} />
        <meshStandardMaterial color="#8fd19e" roughness={1} flatShading />
      </mesh>

      {grassPads.map((p) => (
        <GrassPad key={`g-${p.id}`} x={p.x} z={p.z} y={p.y} w={p.w} d={p.d} />
      ))}

      <InstancedTreeTrunks points={trees} getHeight={getHeight} />
      <InstancedTreeCanopies points={trees} getHeight={getHeight} />

      {turbines}
      {panels}
      <BasketballCourt x={-35} z={130} y={getHeight(-35, 130) + 0.05} />
      <BusStop x={30} z={14} y={getHeight(30, 14)} yaw={0} />
      <BusStop x={70} z={58} y={getHeight(70, 58)} yaw={Math.PI / 2} />
      <BusStop x={120} z={80} y={getHeight(120, 80)} yaw={0} />
      <BusStop x={50} z={124} y={getHeight(50, 124)} yaw={Math.PI / 2} />

      <ParkingLot x={18} z={68} y={getHeight(18, 68)} w={14} d={8} stalls={4} />
      <ParkingLot x={140} z={100} y={getHeight(140, 100)} w={16} d={8} stalls={5} yaw={0.1} />
      <ParkingLot x={88} z={148} y={getHeight(88, 148)} w={12} d={7} stalls={3} />

      <Hydrant x={26} z={38} y={getHeight(26, 38)} />
      <Hydrant x={60} z={72} y={getHeight(60, 72)} />
      <Hydrant x={100} z={58} y={getHeight(100, 58)} />
      <Hydrant x={48} z={118} y={getHeight(48, 118)} />
      <Hydrant x={160} z={88} y={getHeight(160, 88)} />

      <TrashBin x={28} z={50} y={getHeight(28, 50)} />
      <TrashBin x={72} z={90} y={getHeight(72, 90)} color="#e63946" />
      <TrashBin x={112} z={70} y={getHeight(112, 70)} color="#457b9d" />

      <TrafficLight x={38} z={38} y={getHeight(38, 38)} yaw={0} />
      <TrafficLight x={60} z={60} y={getHeight(60, 60)} yaw={Math.PI / 2} />
      <TrafficLight x={104} z={60} y={getHeight(104, 60)} yaw={Math.PI} />
      <TrafficLight x={38} z={104} y={getHeight(38, 104)} yaw={-Math.PI / 2} />
      <TrafficLight x={104} z={104} y={getHeight(104, 104)} yaw={0.4} />

      <ChargingCanopy x={195} z={160} y={getHeight(195, 160)} />

      {/* Curved blue warehouse roofs + crate clutter */}
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
      <CrateStack x={198} z={48} y={getHeight(198, 48)} />
      <CrateStack x={222} z={36} y={getHeight(222, 36)} />
      <group position={[210, getHeight(210, 70), 70]}>
        <mesh castShadow position={[0, 2.0, 0]}>
          <boxGeometry args={[14, 4, 10]} />
          <meshStandardMaterial color="#e9ecef" roughness={0.85} flatShading />
        </mesh>
        <mesh castShadow position={[0, 4.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[5.2, 5.2, 14, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#4cc9f0" roughness={0.7} flatShading side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}
