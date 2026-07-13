import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Procedural F-35A Lightning II — visual target matches the reference still
 * (dark RAM gray, gold canopy, trapezoid wing, canted tails, pylons, gear).
 */

const GRAY = '#6a7076'
const GRAY_DK = '#4e545a'
const GRAY_MID = '#5c6369'
const PANEL = '#585e64'
const RADOME = '#8a9198'
const INTAKE = '#1c1f23'
const GEAR = '#d8dde3'
const TIRE = '#1a1a1a'
const MARK = '#9aa1a8'
const BURN = '#ff6b35'
const GOLD = '#c9a227'

function hullMat(color: string, rough = 0.72, metal = 0.18) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
}

/** Trapezoidal F-35 wing planform (half-span, mirrored). */
function makeWingGeom(side: 1 | -1): THREE.ExtrudeGeometry {
  const s = side
  const shape = new THREE.Shape()
  // Root LE → tip LE → tip TE → root TE (Z forward positive in local xz)
  shape.moveTo(0.05 * s, 1.85)
  shape.lineTo(4.85 * s, 0.35)
  shape.lineTo(4.55 * s, -1.55)
  shape.lineTo(0.15 * s, -1.95)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.03,
    bevelSegments: 1,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0, 0)
  return g
}

function makeStabGeom(side: 1 | -1): THREE.ExtrudeGeometry {
  const s = side
  const shape = new THREE.Shape()
  shape.moveTo(0.1 * s, 0.55)
  shape.lineTo(1.55 * s, 0.15)
  shape.lineTo(1.35 * s, -0.75)
  shape.lineTo(0.1 * s, -0.55)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.02,
    bevelSegments: 1,
  })
  g.rotateX(-Math.PI / 2)
  return g
}

function makeVertTailGeom(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  // Leading edge raked, tip clipped, trailing edge
  shape.moveTo(0, 0)
  shape.lineTo(0.15, 1.55)
  shape.lineTo(-0.55, 1.45)
  shape.lineTo(-1.15, 0.05)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.015,
    bevelSegments: 1,
  })
  return g
}

function PanelStrip({
  position,
  size,
  rotation,
}: {
  position: [number, number, number]
  size: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      {hullMat(PANEL, 0.78, 0.12)}
    </mesh>
  )
}

function GearLeg({
  position,
  twin = false,
  length = 0.85,
}: {
  position: [number, number, number]
  twin?: boolean
  length?: number
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, -length * 0.35, 0]}>
        <cylinderGeometry args={[0.045, 0.055, length * 0.7, 10]} />
        <meshStandardMaterial color={GEAR} metalness={0.55} roughness={0.35} />
      </mesh>
      {/* oleo / scissors detail */}
      <mesh position={[0.06, -length * 0.45, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.04, 0.28, 0.04]} />
        <meshStandardMaterial color="#b8c0c8" metalness={0.5} roughness={0.4} />
      </mesh>
      <group position={[0, -length * 0.72, 0]}>
        {(twin ? [-0.12, 0.12] : [0]).map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
            <meshStandardMaterial color={TIRE} roughness={0.95} metalness={0.05} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, twin ? 0.28 : 0.14, 8]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

function Pylon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.28, 0.55]} />
        {hullMat(GRAY_DK, 0.7, 0.2)}
      </mesh>
      {/* inert store / missile shape */}
      <mesh position={[0, -0.22, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.07, 0.85, 4, 10]} />
        {hullMat(GRAY_MID, 0.65, 0.25)}
      </mesh>
      <mesh position={[0, -0.22, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.22, 8]} />
        {hullMat(GRAY_DK)}
      </mesh>
    </group>
  )
}

export function JetModel({
  staticModel = false,
  afterburner = 0,
  gearDown = true,
}: {
  staticModel?: boolean
  afterburner?: number
  /** Show landing gear (parked / on runway). */
  gearDown?: boolean
}) {
  const nozzle = useRef<THREE.MeshStandardMaterial>(null)
  const fan = useRef<THREE.Group>(null)

  const wingL = useMemo(() => makeWingGeom(-1), [])
  const wingR = useMemo(() => makeWingGeom(1), [])
  const stabL = useMemo(() => makeStabGeom(-1), [])
  const stabR = useMemo(() => makeStabGeom(1), [])
  const vert = useMemo(() => makeVertTailGeom(), [])

  useFrame((state, dt) => {
    if (staticModel) return
    if (fan.current) fan.current.rotation.z += dt * Math.PI * 2 * (10 + afterburner * 16)
    if (nozzle.current) {
      nozzle.current.emissiveIntensity =
        0.2 + afterburner * 1.8 + Math.sin(state.clock.elapsedTime * 28) * 0.12 * afterburner
    }
  })

  return (
    <group scale={1.08}>
      {/* —— Wide flat fuselage (blended body) —— */}
      <mesh castShadow position={[0, 0.55, 0.2]}>
        <boxGeometry args={[1.35, 0.55, 7.6]} />
        {hullMat(GRAY)}
      </mesh>
      {/* Upper diamond / chine deck */}
      <mesh castShadow position={[0, 0.88, 0.15]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.72, 0.72, 6.8]} />
        {hullMat(GRAY_MID, 0.75, 0.15)}
      </mesh>
      {/* Lower belly */}
      <mesh castShadow position={[0, 0.28, 0.1]}>
        <boxGeometry args={[1.15, 0.32, 6.4]} />
        {hullMat(GRAY_DK, 0.78, 0.14)}
      </mesh>
      {/* Shoulder blends into wing */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`sh${s}`} castShadow position={[s * 0.95, 0.52, -0.2]} rotation={[0, 0, s * 0.18]}>
          <boxGeometry args={[1.1, 0.28, 4.2]} />
          {hullMat(GRAY)}
        </mesh>
      ))}

      {/* Nose / radome — lighter gray */}
      <mesh castShadow position={[0, 0.52, 4.35]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.38, 1.7, 12]} />
        {hullMat(RADOME, 0.82, 0.08)}
      </mesh>
      <mesh castShadow position={[0, 0.52, 3.55]}>
        <cylinderGeometry args={[0.42, 0.55, 1.1, 12]} />
        {hullMat(GRAY_MID, 0.76, 0.12)}
      </mesh>
      {/* EOTS chin */}
      <mesh position={[0, 0.22, 3.95]}>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshStandardMaterial color="#0e1012" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Panel lines / bay doors */}
      <PanelStrip position={[0, 0.18, 0.4]} size={[0.95, 0.035, 2.8]} />
      <PanelStrip position={[0, 0.18, -1.6]} size={[0.85, 0.035, 1.6]} />
      <PanelStrip position={[0, 1.05, -0.4]} size={[0.55, 0.03, 3.5]} />
      {([-1, 1] as const).map((s) => (
        <PanelStrip
          key={`saw${s}`}
          position={[s * 0.62, 0.72, 1.4]}
          size={[0.04, 0.22, 1.8]}
          rotation={[0, 0, s * 0.15]}
        />
      ))}

      {/* —— Gold / amber stealth canopy —— */}
      <mesh castShadow position={[0, 1.05, 1.85]}>
        <sphereGeometry args={[0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshPhysicalMaterial
          color={GOLD}
          transmission={0.55}
          thickness={0.45}
          roughness={0.08}
          metalness={0.15}
          transparent
          opacity={0.85}
          ior={1.45}
          attenuationColor="#b8860b"
          attenuationDistance={0.8}
          envMapIntensity={1.4}
        />
      </mesh>
      {/* Canopy frame */}
      <mesh position={[0, 0.95, 1.85]}>
        <torusGeometry args={[0.68, 0.035, 8, 24, Math.PI]} />
        {hullMat(GRAY_DK, 0.55, 0.35)}
      </mesh>
      {/* Cockpit tub + seat silhouette */}
      <mesh position={[0, 0.72, 1.75]}>
        <boxGeometry args={[0.7, 0.35, 1.4]} />
        <meshStandardMaterial color="#121418" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 1.55]}>
        <boxGeometry args={[0.35, 0.45, 0.35]} />
        <meshStandardMaterial color="#1a1e24" roughness={0.85} />
      </mesh>

      {/* DSI intakes — angular, under cockpit shoulders */}
      {([-1, 1] as const).map((s) => (
        <group key={`dsi${s}`} position={[s * 0.72, 0.38, 1.15]}>
          <mesh castShadow rotation={[0.18, s * 0.38, s * 0.12]}>
            <boxGeometry args={[0.7, 0.48, 2.0]} />
            {hullMat(GRAY_DK, 0.7, 0.2)}
          </mesh>
          {/* lip */}
          <mesh position={[s * 0.08, 0.02, 0.95]} rotation={[0.2, s * 0.35, 0]} castShadow>
            <boxGeometry args={[0.55, 0.38, 0.12]} />
            <meshStandardMaterial color={INTAKE} roughness={0.95} metalness={0.05} />
          </mesh>
          {/* internal duct darkness */}
          <mesh position={[s * 0.05, 0, 0.55]} rotation={[0.15, s * 0.3, 0]}>
            <boxGeometry args={[0.4, 0.28, 0.9]} />
            <meshStandardMaterial color="#050607" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* —— Main wings —— */}
      <mesh geometry={wingL} castShadow receiveShadow position={[0, 0.52, -0.35]}>
        {hullMat(GRAY)}
      </mesh>
      <mesh geometry={wingR} castShadow receiveShadow position={[0, 0.52, -0.35]}>
        {hullMat(GRAY)}
      </mesh>
      {/* Wing panel accents */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`wpanel${s}`}
          position={[s * 2.6, 0.575, -0.5]}
          rotation={[-Math.PI / 2, 0, s * 0.12]}
        >
          <planeGeometry args={[2.2, 1.6]} />
          <meshStandardMaterial color={PANEL} roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Canted twin vertical tails */}
      {([-1, 1] as const).map((s) => (
        <group key={`vt${s}`} position={[s * 1.15, 0.55, -3.05]} rotation={[0.06, 0, s * 0.48]}>
          <mesh geometry={vert} castShadow>
            {hullMat(GRAY)}
          </mesh>
          <mesh position={[-0.35, 0.85, 0.04]}>
            <boxGeometry args={[0.55, 0.04, 0.02]} />
            <meshStandardMaterial color={MARK} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* All-moving horizontal stabs */}
      <mesh geometry={stabL} castShadow position={[0.85, 0.48, -3.85]} rotation={[0.02, 0.08, 0]}>
        {hullMat(GRAY_MID)}
      </mesh>
      <mesh geometry={stabR} castShadow position={[-0.85, 0.48, -3.85]} rotation={[0.02, -0.08, 0]}>
        {hullMat(GRAY_MID)}
      </mesh>

      {/* Wing hardpoint pylons (outer + mid) */}
      {([-1, 1] as const).flatMap((s) =>
        [
          [s * 2.1, 0.38, -0.2],
          [s * 3.35, 0.38, -0.45],
        ].map((p, i) => <Pylon key={`p${s}${i}`} position={p as [number, number, number]} />),
      )}

      {/* Landing gear */}
      {gearDown && (
        <group>
          <GearLeg position={[0, 0.15, 2.65]} twin length={0.95} />
          <GearLeg position={[1.15, 0.15, -0.35]} length={0.9} />
          <GearLeg position={[-1.15, 0.15, -0.35]} length={0.9} />
          {/* bay doors ajar */}
          {([-1, 1] as const).map((s) => (
            <mesh key={`door${s}`} position={[s * 0.55, 0.12, -0.2]} rotation={[0, 0, s * 0.9]}>
              <boxGeometry args={[0.45, 0.03, 0.9]} />
              {hullMat(GRAY_DK)}
            </mesh>
          ))}
        </group>
      )}

      {/* Exhaust nozzle */}
      <mesh castShadow position={[0, 0.52, -4.15]}>
        <cylinderGeometry args={[0.38, 0.48, 0.9, 18]} />
        {hullMat(GRAY_DK, 0.45, 0.55)}
      </mesh>
      <mesh position={[0, 0.52, -4.65]}>
        <cylinderGeometry args={[0.34, 0.32, 0.28, 18]} />
        <meshStandardMaterial
          ref={nozzle}
          color={BURN}
          emissive={BURN}
          emissiveIntensity={staticModel ? 0.1 : 0.3}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>
      <group ref={fan} position={[0, 0.52, -3.55]}>
        <mesh>
          <cylinderGeometry args={[0.28, 0.28, 0.05, 16]} />
          <meshStandardMaterial color="#2a3036" metalness={0.75} roughness={0.35} />
        </mesh>
      </group>

      {!staticModel && afterburner > 0.08 && (
        <mesh position={[0, 0.52, -5.35 - afterburner * 0.7]} scale={[1, 1, 1 + afterburner * 1.3]}>
          <coneGeometry args={[0.3, 2.0 + afterburner * 2.2, 12]} />
          <meshStandardMaterial
            color="#ffd60a"
            emissive="#ff6b35"
            emissiveIntensity={1 + afterburner}
            transparent
            opacity={0.35 + afterburner * 0.35}
            depthWrite={false}
            roughness={1}
          />
        </mesh>
      )}

      {/* Low-vis wing markings */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`mark${s}`} position={[s * 2.9, 0.58, -0.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.28, 5]} />
          <meshStandardMaterial color={MARK} roughness={0.75} metalness={0.05} />
        </mesh>
      ))}

      {/* Nav lights */}
      <mesh position={[4.7, 0.55, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[-4.7, 0.55, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.5, 5.05]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.85} />
      </mesh>
    </group>
  )
}
