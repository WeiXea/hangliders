import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createLoftBody,
  getHeliPaintTexture,
  usePaintSkinMaps,
} from './vehicleSurfaces'

const GLASS = '#7ec8e3'
const ROTOR = '#1a1d21'
const SKID = '#c5ccd3'
const ACCENT = '#ffd60a'

function RotorBlade({ length = 2.7 }: { length?: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0.08, -0.06)
    s.lineTo(length, -0.04)
    s.lineTo(length + 0.08, 0)
    s.lineTo(length, 0.05)
    s.lineTo(0.12, 0.08)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.01,
      bevelSegments: 1,
    })
    g.rotateX(-Math.PI / 2)
    return g
  }, [length])
  return (
    <mesh geometry={shape} castShadow>
      <meshPhysicalMaterial color={ROTOR} roughness={0.45} metalness={0.55} clearcoat={0.25} />
    </mesh>
  )
}

/** Utility chopper with lofted body, glass bubble, airfoil blades — glider-tier materials. */
export function HelicopterModel({
  staticModel = false,
  rpm = 1,
}: {
  staticModel?: boolean
  rpm?: number
}) {
  const mainRotor = useRef<THREE.Group>(null)
  const tailRotor = useRef<THREE.Group>(null)
  const paint = useMemo(() => getHeliPaintTexture(), [])
  const skin = usePaintSkinMaps(2)
  const normalScale = useMemo(() => new THREE.Vector2(0.5, 0.5), [])

  const body = useMemo(
    () =>
      createLoftBody(
        [
          { z: 1.55, rx: 0.2, ry: 0.22 },
          { z: 1.15, rx: 0.48, ry: 0.42 },
          { z: 0.55, rx: 0.68, ry: 0.55 },
          { z: 0, rx: 0.72, ry: 0.58 },
          { z: -0.7, rx: 0.62, ry: 0.5 },
          { z: -1.4, rx: 0.35, ry: 0.32 },
          { z: -2.2, rx: 0.16, ry: 0.16 },
          { z: -3.15, rx: 0.1, ry: 0.1 },
        ],
        20,
      ),
    [],
  )

  const paintMat = {
    map: paint,
    normalMap: skin.normalMap,
    normalScale,
    roughnessMap: skin.roughnessMap,
    roughness: 0.42,
    metalness: 0.35,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
  } as const

  useFrame((_, dt) => {
    if (staticModel) return
    const spin = rpm * dt * Math.PI * 2 * 8
    if (mainRotor.current) mainRotor.current.rotation.y += spin
    if (tailRotor.current) tailRotor.current.rotation.x += spin * 1.6
  })

  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow position={[0, 0.45, 0]}>
        <meshPhysicalMaterial {...paintMat} />
      </mesh>

      {/* Cabin glass bubble */}
      <mesh castShadow position={[0, 0.72, 0.45]}>
        <sphereGeometry args={[0.78, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
        <meshPhysicalMaterial
          color={GLASS}
          transmission={0.65}
          thickness={0.35}
          roughness={0.05}
          metalness={0.05}
          transparent
          opacity={0.75}
          ior={1.45}
          envMapIntensity={1.3}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      {/* Frame strips */}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.7, 0.55]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.04, 0.55, 0.9]} />
          <meshPhysicalMaterial color="#1b4332" metalness={0.4} roughness={0.45} />
        </mesh>
      ))}

      {/* Engine cowling */}
      <mesh castShadow position={[0, 0.95, -0.35]}>
        <boxGeometry args={[0.85, 0.45, 1.1]} />
        <meshPhysicalMaterial {...paintMat} />
      </mesh>
      <mesh position={[0.35, 0.95, -0.9]}>
        <cylinderGeometry args={[0.12, 0.14, 0.35, 12]} />
        <meshStandardMaterial color="#212529" roughness={0.6} />
      </mesh>

      {/* Tail fin + stab */}
      <mesh castShadow position={[0, 0.85, -3.05]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.07, 0.85, 0.95]} />
        <meshPhysicalMaterial {...paintMat} />
      </mesh>
      <mesh castShadow position={[0.35, 0.55, -3.0]} rotation={[0, 0.1, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.45]} />
        <meshPhysicalMaterial {...paintMat} />
      </mesh>
      {/* Yellow tip */}
      <mesh position={[0, 1.2, -3.2]}>
        <boxGeometry args={[0.08, 0.2, 0.25]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.2} />
      </mesh>

      {/* Skids */}
      {([-0.55, 0.55] as const).map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, -0.12, 0.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 2.5, 12]} />
            <meshPhysicalMaterial color={SKID} metalness={0.75} roughness={0.25} clearcoat={0.4} />
          </mesh>
          {/* upturned toe */}
          <mesh position={[x, -0.05, 1.25]} rotation={[0.6, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
            <meshPhysicalMaterial color={SKID} metalness={0.75} roughness={0.25} />
          </mesh>
          <mesh position={[x, 0.18, 0.55]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.55, 8]} />
            <meshPhysicalMaterial color={SKID} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x, 0.18, -0.5]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.55, 8]} />
            <meshPhysicalMaterial color={SKID} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Mast */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.65, 12]} />
        <meshPhysicalMaterial color="#ced4da" metalness={0.7} roughness={0.28} clearcoat={0.35} />
      </mesh>

      <group ref={mainRotor} position={[0, 1.68, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <RotorBlade />
          </group>
        ))}
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.14, 14]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.3} />
        </mesh>
      </group>

      <group ref={tailRotor} position={[0.22, 0.9, -3.15]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[(i * Math.PI) / 3, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.04, 0.95, 0.1]} />
            <meshPhysicalMaterial color={ROTOR} roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Landing light */}
      <mesh position={[0, 0.18, 1.45]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.9} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 1.15, 0.9]}>
        <cylinderGeometry args={[0.015, 0.015, 0.45, 6]} />
        <meshPhysicalMaterial color="#adb5bd" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}
