import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createLoftBody,
  getJetPanelTexture,
  usePaintSkinMaps,
} from './vehicleSurfaces'

const RADOME = '#8b9299'
const INTAKE = '#121518'
const GEAR = '#d8dde3'
const TIRE = '#151515'
const BURN = '#ff6b35'
const GOLD = '#c9a227'

function makeWingGeom(side: 1 | -1): THREE.ExtrudeGeometry {
  const s = side
  const shape = new THREE.Shape()
  shape.moveTo(0.08 * s, 1.95)
  shape.lineTo(5.05 * s, 0.4)
  shape.lineTo(4.7 * s, -1.65)
  shape.lineTo(0.12 * s, -2.05)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.04,
    bevelSegments: 2,
  })
  g.rotateX(-Math.PI / 2)
  return g
}

function makeStabGeom(side: 1 | -1): THREE.ExtrudeGeometry {
  const s = side
  const shape = new THREE.Shape()
  shape.moveTo(0.08 * s, 0.6)
  shape.lineTo(1.65 * s, 0.18)
  shape.lineTo(1.4 * s, -0.82)
  shape.lineTo(0.08 * s, -0.58)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.025,
    bevelSegments: 2,
  })
  g.rotateX(-Math.PI / 2)
  return g
}

function makeVertTailGeom(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0.18, 1.65)
  shape.lineTo(-0.58, 1.52)
  shape.lineTo(-1.22, 0.06)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.02,
    bevelSegments: 2,
  })
}

function GearLeg({
  position,
  twin = false,
  length = 0.9,
}: {
  position: [number, number, number]
  twin?: boolean
  length?: number
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, -length * 0.32, 0]}>
        <cylinderGeometry args={[0.042, 0.055, length * 0.68, 12]} />
        <meshPhysicalMaterial color={GEAR} metalness={0.7} roughness={0.28} clearcoat={0.4} />
      </mesh>
      <mesh position={[0.07, -length * 0.42, 0]} rotation={[0, 0, 0.45]} castShadow>
        <boxGeometry args={[0.035, 0.3, 0.035]} />
        <meshPhysicalMaterial color="#b8c0c8" metalness={0.65} roughness={0.35} />
      </mesh>
      <group position={[0, -length * 0.7, 0]}>
        {(twin ? [-0.11, 0.11] : [0]).map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.155, 0.155, 0.11, 18]} />
            <meshStandardMaterial color={TIRE} roughness={0.95} metalness={0.05} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, twin ? 0.26 : 0.13, 10]} />
          <meshPhysicalMaterial color="#9aa3aa" metalness={0.8} roughness={0.25} clearcoat={0.35} />
        </mesh>
      </group>
    </group>
  )
}

function Pylon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.075, 0.26, 0.5]} />
        <meshPhysicalMaterial color="#4a5056" roughness={0.55} metalness={0.35} clearcoat={0.2} />
      </mesh>
      <mesh position={[0, -0.2, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.065, 0.8, 5, 12]} />
        <meshPhysicalMaterial color="#5a6168" roughness={0.45} metalness={0.4} clearcoat={0.25} />
      </mesh>
      <mesh position={[0, -0.2, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.065, 0.2, 10]} />
        <meshPhysicalMaterial color="#3d4348" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  )
}

/**
 * F-35A Lightning II — lofted fuselage, panel-mapped RAM skin,
 * gold canopy, trapezoid wings (same material recipe as the glider).
 */
export function JetModel({
  staticModel = false,
  afterburner = 0,
  gearDown = true,
}: {
  staticModel?: boolean
  afterburner?: number
  gearDown?: boolean
}) {
  const nozzle = useRef<THREE.MeshStandardMaterial>(null)
  const fan = useRef<THREE.Group>(null)
  const panelMap = useMemo(() => getJetPanelTexture(), [])
  const skin = usePaintSkinMaps(2.5)
  const normalScale = useMemo(() => new THREE.Vector2(0.7, 0.7), [])

  const fuselage = useMemo(
    () =>
      createLoftBody(
        [
          { z: 5.15, rx: 0.02, ry: 0.02 },
          { z: 4.55, rx: 0.28, ry: 0.26 },
          { z: 3.9, rx: 0.48, ry: 0.42 },
          { z: 3.1, rx: 0.62, ry: 0.52 },
          { z: 2.2, rx: 0.72, ry: 0.58 },
          { z: 1.2, rx: 0.78, ry: 0.62 },
          { z: 0.2, rx: 0.82, ry: 0.6 },
          { z: -0.8, rx: 0.8, ry: 0.55 },
          { z: -1.8, rx: 0.72, ry: 0.5 },
          { z: -2.8, rx: 0.58, ry: 0.45 },
          { z: -3.6, rx: 0.48, ry: 0.42 },
          { z: -4.2, rx: 0.42, ry: 0.4 },
          { z: -4.55, rx: 0.36, ry: 0.36 },
        ],
        24,
      ),
    [],
  )

  const wingL = useMemo(() => makeWingGeom(-1), [])
  const wingR = useMemo(() => makeWingGeom(1), [])
  const stabL = useMemo(() => makeStabGeom(-1), [])
  const stabR = useMemo(() => makeStabGeom(1), [])
  const vert = useMemo(() => makeVertTailGeom(), [])

  const hullProps = {
    map: panelMap,
    normalMap: skin.normalMap,
    normalScale,
    roughnessMap: skin.roughnessMap,
    roughness: 0.68,
    metalness: 0.22,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
  } as const

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
      {/* Smooth lofted fuselage */}
      <mesh geometry={fuselage} castShadow receiveShadow position={[0, 0.55, 0]}>
        <meshPhysicalMaterial {...hullProps} />
      </mesh>

      {/* Lighter radome tip */}
      <mesh castShadow position={[0, 0.55, 4.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 0.85, 16]} />
        <meshPhysicalMaterial color={RADOME} roughness={0.85} metalness={0.06} clearcoat={0.1} />
      </mesh>
      {/* EOTS */}
      <mesh position={[0, 0.28, 4.15]}>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshPhysicalMaterial color="#0c0e10" metalness={0.95} roughness={0.15} clearcoat={0.6} />
      </mesh>

      {/* Gold stealth canopy */}
      <mesh castShadow position={[0, 1.02, 1.9]}>
        <sphereGeometry args={[0.7, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshPhysicalMaterial
          color={GOLD}
          transmission={0.58}
          thickness={0.5}
          roughness={0.06}
          metalness={0.12}
          transparent
          opacity={0.88}
          ior={1.48}
          attenuationColor="#b8860b"
          attenuationDistance={0.7}
          envMapIntensity={1.5}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh position={[0, 0.92, 1.9]} rotation={[0.15, 0, 0]}>
        <torusGeometry args={[0.66, 0.03, 8, 28, Math.PI]} />
        <meshPhysicalMaterial color="#3a4046" metalness={0.55} roughness={0.4} clearcoat={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 1.75]}>
        <boxGeometry args={[0.65, 0.32, 1.35]} />
        <meshStandardMaterial color="#101318" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.92, 1.55]}>
        <boxGeometry args={[0.32, 0.42, 0.32]} />
        <meshStandardMaterial color="#1a1e24" roughness={0.85} />
      </mesh>

      {/* DSI intakes */}
      {([-1, 1] as const).map((s) => (
        <group key={`dsi${s}`} position={[s * 0.7, 0.4, 1.2]}>
          <mesh castShadow rotation={[0.16, s * 0.36, s * 0.1]}>
            <boxGeometry args={[0.68, 0.46, 1.95]} />
            <meshPhysicalMaterial {...hullProps} />
          </mesh>
          <mesh position={[s * 0.06, 0.02, 0.92]} rotation={[0.18, s * 0.32, 0]} castShadow>
            <boxGeometry args={[0.52, 0.36, 0.1]} />
            <meshStandardMaterial color={INTAKE} roughness={0.95} />
          </mesh>
          <mesh position={[s * 0.04, 0, 0.5]} rotation={[0.12, s * 0.28, 0]}>
            <boxGeometry args={[0.38, 0.26, 0.85]} />
            <meshStandardMaterial color="#050607" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Wings */}
      <mesh geometry={wingL} castShadow receiveShadow position={[0, 0.52, -0.35]}>
        <meshPhysicalMaterial {...hullProps} />
      </mesh>
      <mesh geometry={wingR} castShadow receiveShadow position={[0, 0.52, -0.35]}>
        <meshPhysicalMaterial {...hullProps} />
      </mesh>

      {/* Canted verticals */}
      {([-1, 1] as const).map((s) => (
        <group key={`vt${s}`} position={[s * 1.12, 0.55, -3.1]} rotation={[0.05, 0, s * 0.48]}>
          <mesh geometry={vert} castShadow>
            <meshPhysicalMaterial {...hullProps} />
          </mesh>
        </group>
      ))}

      {/* Horizontals */}
      <mesh geometry={stabL} castShadow position={[0.88, 0.48, -3.9]}>
        <meshPhysicalMaterial {...hullProps} />
      </mesh>
      <mesh geometry={stabR} castShadow position={[-0.88, 0.48, -3.9]}>
        <meshPhysicalMaterial {...hullProps} />
      </mesh>

      {/* Hardpoints */}
      {([-1, 1] as const).flatMap((s) =>
        [
          [s * 2.15, 0.38, -0.15],
          [s * 3.4, 0.38, -0.4],
        ].map((p, i) => <Pylon key={`p${s}${i}`} position={p as [number, number, number]} />),
      )}

      {gearDown && (
        <group>
          <GearLeg position={[0, 0.18, 2.7]} twin length={0.95} />
          <GearLeg position={[1.12, 0.18, -0.3]} length={0.88} />
          <GearLeg position={[-1.12, 0.18, -0.3]} length={0.88} />
        </group>
      )}

      {/* Nozzle */}
      <mesh castShadow position={[0, 0.55, -4.25]}>
        <cylinderGeometry args={[0.36, 0.46, 0.85, 20]} />
        <meshPhysicalMaterial color="#3a4046" metalness={0.7} roughness={0.35} clearcoat={0.25} />
      </mesh>
      <mesh position={[0, 0.55, -4.7]}>
        <cylinderGeometry args={[0.32, 0.3, 0.26, 20]} />
        <meshStandardMaterial
          ref={nozzle}
          color={BURN}
          emissive={BURN}
          emissiveIntensity={staticModel ? 0.1 : 0.3}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>
      <group ref={fan} position={[0, 0.55, -3.6]}>
        <mesh>
          <cylinderGeometry args={[0.26, 0.26, 0.05, 16]} />
          <meshPhysicalMaterial color="#2a3036" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {!staticModel && afterburner > 0.08 && (
        <mesh position={[0, 0.55, -5.4 - afterburner * 0.7]} scale={[1, 1, 1 + afterburner * 1.3]}>
          <coneGeometry args={[0.28, 2 + afterburner * 2.2, 14]} />
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

      {([-1, 1] as const).map((s) => (
        <mesh key={`mk${s}`} position={[s * 2.95, 0.585, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.26, 5]} />
          <meshStandardMaterial color="#9aa1a8" roughness={0.75} />
        </mesh>
      ))}

      <mesh position={[4.75, 0.55, 0.25]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[-4.75, 0.55, 0.25]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.52, 5.2]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}
