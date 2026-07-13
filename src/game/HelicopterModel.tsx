import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FUSELAGE = '#2d6a4f'
const FUSELAGE_DK = '#1b4332'
const GLASS = '#90e0ef'
const ROTOR = '#212529'
const SKID = '#adb5bd'
const ACCENT = '#ffd60a'

/** Lightweight utility chopper — spins rotors when not static. */
export function HelicopterModel({
  staticModel = false,
  rpm = 1,
}: {
  staticModel?: boolean
  rpm?: number
}) {
  const mainRotor = useRef<THREE.Group>(null)
  const tailRotor = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    if (staticModel) return
    const spin = rpm * dt * Math.PI * 2 * 8
    if (mainRotor.current) mainRotor.current.rotation.y += spin
    if (tailRotor.current) tailRotor.current.rotation.x += spin * 1.6
  })

  return (
    <group>
      {/* Cabin bubble */}
      <mesh castShadow position={[0, 0.55, 0.35]}>
        <sphereGeometry args={[0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.45} roughness={0.1} metalness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.35, 0.15]}>
        <capsuleGeometry args={[0.55, 1.4, 6, 12]} />
        <meshStandardMaterial color={FUSELAGE} roughness={0.4} metalness={0.35} />
      </mesh>
      {/* Nose */}
      <mesh castShadow position={[0, 0.35, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.45, 0.9, 10]} />
        <meshStandardMaterial color={FUSELAGE} roughness={0.4} metalness={0.35} />
      </mesh>
      {/* Tail boom */}
      <mesh castShadow position={[0, 0.55, -1.8]}>
        <cylinderGeometry args={[0.12, 0.22, 2.8, 8]} />
        <meshStandardMaterial color={FUSELAGE_DK} roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.75, -3.15]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.08, 0.7, 0.9]} />
        <meshStandardMaterial color={FUSELAGE} roughness={0.4} />
      </mesh>
      {/* Skids */}
      {([-0.55, 0.55] as const).map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, -0.15, 0.1]} rotation={[0, 0, 0.05 * Math.sign(x)]}>
            <cylinderGeometry args={[0.05, 0.05, 2.4, 8]} />
            <meshStandardMaterial color={SKID} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x, 0.1, 0.55]}>
            <cylinderGeometry args={[0.04, 0.04, 0.55, 6]} />
            <meshStandardMaterial color={SKID} metalness={0.65} />
          </mesh>
          <mesh position={[x, 0.1, -0.45]}>
            <cylinderGeometry args={[0.04, 0.04, 0.55, 6]} />
            <meshStandardMaterial color={SKID} metalness={0.65} />
          </mesh>
        </group>
      ))}
      {/* Main rotor mast + blades */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.7, 8]} />
        <meshStandardMaterial color="#ced4da" metalness={0.6} />
      </mesh>
      <group ref={mainRotor} position={[0, 1.7, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.08, 5.6, 0.22]} />
          <meshStandardMaterial color={ROTOR} roughness={0.55} />
        </mesh>
        <mesh castShadow rotation={[0, Math.PI / 2, Math.PI / 2]}>
          <boxGeometry args={[0.08, 5.6, 0.22]} />
          <meshStandardMaterial color={ROTOR} roughness={0.55} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 10]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.25} />
        </mesh>
      </group>
      {/* Tail rotor */}
      <group ref={tailRotor} position={[0.2, 0.85, -3.2]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.05, 1.1, 0.12]} />
          <meshStandardMaterial color={ROTOR} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <boxGeometry args={[0.05, 1.1, 0.12]} />
          <meshStandardMaterial color={ROTOR} />
        </mesh>
      </group>
      {/* Spot light under nose */}
      <mesh position={[0, 0.15, 1.35]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}
