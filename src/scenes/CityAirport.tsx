import { useMemo, type ReactNode } from 'react'
import { Text } from '@react-three/drei'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { CITY_STREET_DECK } from '../game/cityBuildings'

/** Coastal municipal airfield west of downtown — runway along +X. */
export const AIRPORT = {
  cx: -95,
  cz: 40,
  yaw: Math.PI / 2,
  runwayLen: 220,
  runwayW: 28,
} as const

/** Spawn / parking pose for the F-35 on the apron. */
export const F35_PARK = {
  x: AIRPORT.cx - 40,
  z: AIRPORT.cz + 22,
  yaw: AIRPORT.yaw,
} as const

/** Runway, taxiways, hangar, tower, lights — city airfield. */
export function CityAirport() {
  const getHeight = BIOME_CONFIGS.city.getHeight
  const { cx, cz, runwayLen, runwayW } = AIRPORT

  const parts = useMemo(() => {
    const y = (x: number, z: number) => getHeight(x, z) + CITY_STREET_DECK
    const midY = y(cx, cz)
    const nodes: ReactNode[] = []

    // Main runway deck
    nodes.push(
      <mesh key="rwy" position={[cx, midY + 0.06, cz]} receiveShadow>
        <boxGeometry args={[runwayLen, 0.14, runwayW]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.92} />
      </mesh>,
    )
    // Centerline
    nodes.push(
      <mesh key="cl" position={[cx, midY + 0.14, cz]}>
        <boxGeometry args={[runwayLen * 0.92, 0.02, 0.35]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.7} />
      </mesh>,
    )
    // Edge lines
    for (const side of [-1, 1] as const) {
      nodes.push(
        <mesh key={`edge${side}`} position={[cx, midY + 0.14, cz + side * (runwayW * 0.5 - 0.4)]}>
          <boxGeometry args={[runwayLen * 0.95, 0.02, 0.25]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.7} />
        </mesh>,
      )
    }
    // Threshold bars
    for (const end of [-1, 1] as const) {
      for (let i = 0; i < 6; i++) {
        nodes.push(
          <mesh
            key={`th${end}-${i}`}
            position={[
              cx + end * (runwayLen * 0.5 - 8),
              midY + 0.14,
              cz - 8 + i * 3.2,
            ]}
          >
            <boxGeometry args={[6, 0.02, 1.2]} />
            <meshStandardMaterial color="#f8f9fa" roughness={0.65} />
          </mesh>,
        )
      }
    }

    // Taxiway to apron (north)
    nodes.push(
      <mesh key="taxi" position={[cx - 35, midY + 0.05, cz + 18]} receiveShadow>
        <boxGeometry args={[36, 0.12, 14]} />
        <meshStandardMaterial color="#343a40" roughness={0.9} />
      </mesh>,
    )
    // Apron pad
    nodes.push(
      <mesh key="apron" position={[cx - 55, midY + 0.05, cz + 28]} receiveShadow>
        <boxGeometry args={[48, 0.12, 36]} />
        <meshStandardMaterial color="#3d4248" roughness={0.88} />
      </mesh>,
    )

    // Hangar
    const hx = cx - 70
    const hz = cz + 38
    const hy = y(hx, hz)
    nodes.push(
      <group key="hangar" position={[hx, hy, hz]}>
        <mesh castShadow position={[0, 4.2, 0]}>
          <boxGeometry args={[28, 8.4, 22]} />
          <meshStandardMaterial color="#6c757d" roughness={0.75} metalness={0.25} />
        </mesh>
        <mesh position={[0, 8.6, 0]} castShadow>
          <boxGeometry args={[30, 0.6, 24]} />
          <meshStandardMaterial color="#495057" roughness={0.7} metalness={0.35} />
        </mesh>
        {/* Open bay */}
        <mesh position={[0, 3.2, 11.2]}>
          <boxGeometry args={[22, 6.2, 0.3]} />
          <meshStandardMaterial color="#212529" roughness={0.9} />
        </mesh>
        <Text
          position={[0, 7.2, 11.4]}
          fontSize={1.4}
          color="#ffd60a"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000"
        >
          HANGAR 1
        </Text>
      </group>,
    )

    // Control tower
    const tx = cx - 48
    const tz = cz + 48
    const ty = y(tx, tz)
    nodes.push(
      <group key="tower" position={[tx, ty, tz]}>
        <mesh castShadow position={[0, 5, 0]}>
          <boxGeometry args={[5.5, 10, 5.5]} />
          <meshStandardMaterial color="#868e96" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh castShadow position={[0, 11.2, 0]}>
          <boxGeometry args={[7.5, 3.2, 7.5]} />
          <meshStandardMaterial color="#adb5bd" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 12.5, 3.6]}>
          <boxGeometry args={[6.5, 1.6, 0.12]} />
          <meshStandardMaterial
            color="#90e0ef"
            transparent
            opacity={0.45}
            roughness={0.1}
            metalness={0.5}
          />
        </mesh>
        <mesh position={[0, 13.5, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 2.2, 8]} />
          <meshStandardMaterial color="#ced4da" metalness={0.7} />
        </mesh>
        <mesh position={[0, 14.7, 0]}>
          <sphereGeometry args={[0.35, 10, 10]} />
          <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={0.6} />
        </mesh>
        <Text
          position={[0, 8.2, 2.9]}
          fontSize={0.7}
          color="#f8f9fa"
          anchorX="center"
          outlineWidth={0.03}
          outlineColor="#000"
        >
          ATCT
        </Text>
      </group>,
    )

    // Runway edge lights
    for (let i = 0; i < 18; i++) {
      const lx = cx - runwayLen * 0.45 + i * (runwayLen * 0.9) / 17
      for (const side of [-1, 1] as const) {
        const lz = cz + side * (runwayW * 0.5 + 0.8)
        const ly = y(lx, lz) + 0.25
        nodes.push(
          <mesh key={`rl${i}-${side}`} position={[lx, ly, lz]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial
              color={side > 0 ? '#52b788' : '#e63946'}
              emissive={side > 0 ? '#52b788' : '#e63946'}
              emissiveIntensity={0.85}
            />
          </mesh>,
        )
      }
    }

    // Wind sock pole
    const wx = cx + 70
    const wz = cz + 20
    const wy = y(wx, wz)
    nodes.push(
      <group key="windsock" position={[wx, wy, wz]}>
        <mesh castShadow position={[0, 4, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 8, 8]} />
          <meshStandardMaterial color="#adb5bd" metalness={0.6} />
        </mesh>
        <mesh position={[1.2, 7.2, 0]} rotation={[0, 0, -0.35]} castShadow>
          <coneGeometry args={[0.55, 2.4, 8]} />
          <meshStandardMaterial color="#e63946" roughness={0.65} />
        </mesh>
      </group>,
    )

    // Airport sign
    nodes.push(
      <Text
        key="sign"
        position={[cx - 55, midY + 3.5, cz + 48]}
        fontSize={2.2}
        color="#ffd60a"
        anchorX="center"
        outlineWidth={0.06}
        outlineColor="#111"
      >
        SKYLINE MUNICIPAL
      </Text>,
    )
    nodes.push(
      <Text
        key="sign2"
        position={[cx - 55, midY + 1.6, cz + 48]}
        fontSize={1.1}
        color="#f8f9fa"
        anchorX="center"
        outlineWidth={0.04}
        outlineColor="#111"
      >
        F-35 READY — APRON
      </Text>,
    )

    return nodes
  }, [getHeight, cx, cz, runwayLen, runwayW])

  return <group>{parts}</group>
}
