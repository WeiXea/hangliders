import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Stealth grays inspired by real F-35 Lightning II finishes. */
const HULL = '#7a8288'
const HULL_DK = '#5a6168'
const HULL_LT = '#9aa3aa'
const EDGE = '#4a5056'
const CANOPY = '#0d1b2a'
const INTAKE = '#1a1d21'
const MARK = '#e9ecef'
const BURN = '#ff6b35'

/**
 * F-35A silhouette — single nozzle, DSI intakes, diamond fuselage,
 * wide delta, canted V-tails (visual target: Sketchfab Lightning look).
 * @see https://skfb.ly/6ZztV
 */
export function JetModel({
  staticModel = false,
  afterburner = 0,
}: {
  staticModel?: boolean
  afterburner?: number
}) {
  const nozzle = useRef<THREE.MeshStandardMaterial>(null)
  const fan = useRef<THREE.Group>(null)

  useFrame((state, dt) => {
    if (staticModel) return
    if (fan.current) fan.current.rotation.z += dt * Math.PI * 2 * (10 + afterburner * 16)
    if (nozzle.current) {
      nozzle.current.emissiveIntensity =
        0.25 + afterburner * 1.6 + Math.sin(state.clock.elapsedTime * 32) * 0.1 * afterburner
    }
  })

  const mat = (color: string, metal = 0.62, rough = 0.38) => (
    <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
  )

  return (
    <group scale={1.05}>
      {/* —— Fuselage: faceted diamond cross-section —— */}
      <mesh castShadow position={[0, 0.62, 0.15]}>
        <boxGeometry args={[1.05, 0.72, 8.4]} />
        {mat(HULL)}
      </mesh>
      <mesh castShadow position={[0, 0.95, 0.1]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.78, 0.78, 7.6]} />
        {mat(HULL_DK, 0.58, 0.4)}
      </mesh>
      <mesh castShadow position={[0, 0.55, 0.1]}>
        <capsuleGeometry args={[0.48, 7.4, 6, 14]} />
        {mat(HULL_LT, 0.55, 0.36)}
      </mesh>

      {/* Nose — sharp chine + radome */}
      <mesh castShadow position={[0, 0.58, 4.55]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.42, 1.85, 10]} />
        {mat(HULL_LT, 0.5, 0.32)}
      </mesh>
      <mesh castShadow position={[0, 0.52, 3.55]}>
        <boxGeometry args={[0.95, 0.35, 1.4]} />
        {mat(EDGE, 0.65, 0.35)}
      </mesh>
      {/* EOTS chin bulge */}
      <mesh position={[0, 0.28, 4.15]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#111418" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Bubble canopy (F-35 style) */}
      <mesh castShadow position={[0, 1.12, 1.95]}>
        <sphereGeometry args={[0.68, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial
          color={CANOPY}
          transparent
          opacity={0.62}
          roughness={0.06}
          metalness={0.35}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh position={[0, 0.88, 1.75]}>
        <boxGeometry args={[0.75, 0.28, 1.55]} />
        {mat(EDGE)}
      </mesh>

      {/* DSI / diverterless intakes */}
      {([-1, 1] as const).map((s) => (
        <group key={`dsi${s}`} position={[s * 0.78, 0.42, 1.05]}>
          <mesh castShadow rotation={[0.2, s * 0.42, s * 0.08]}>
            <boxGeometry args={[0.62, 0.5, 2.1]} />
            <meshStandardMaterial color={INTAKE} roughness={0.7} metalness={0.25} />
          </mesh>
          <mesh position={[s * 0.05, 0.05, 0.9]} rotation={[0.15, s * 0.3, 0]}>
            <boxGeometry args={[0.5, 0.35, 0.15]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Main delta wing — wide, thin */}
      <mesh castShadow position={[0, 0.55, -0.55]} rotation={[0.015, 0, 0]}>
        <boxGeometry args={[10.8, 0.11, 3.8]} />
        {mat(HULL)}
      </mesh>
      {/* Leading-edge root extensions */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`lerx${s}`}
          castShadow
          position={[s * 1.15, 0.62, 1.35]}
          rotation={[0.05, s * 0.72, s * 0.04]}
        >
          <boxGeometry args={[2.4, 0.09, 1.6]} />
          {mat(HULL_DK)}
        </mesh>
      ))}
      {/* Wingtip rake */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`tip${s}`}
          castShadow
          position={[s * 5.15, 0.56, -0.9]}
          rotation={[0, s * 0.35, 0]}
        >
          <boxGeometry args={[1.1, 0.08, 1.8]} />
          {mat(EDGE)}
        </mesh>
      ))}

      {/* Canted twin vertical tails */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`vt${s}`}
          castShadow
          position={[s * 1.35, 1.35, -3.15]}
          rotation={[0.08, 0, s * 0.52]}
        >
          <boxGeometry args={[0.09, 1.85, 1.95]} />
          {mat(HULL)}
        </mesh>
      ))}

      {/* All-moving horizontal tails */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`ht${s}`}
          castShadow
          position={[s * 1.85, 0.5, -3.75]}
          rotation={[-0.05, s * 0.25, 0]}
        >
          <boxGeometry args={[2.6, 0.07, 1.35]} />
          {mat(HULL_DK)}
        </mesh>
      ))}

      {/* Weapons-bay panel lines */}
      <mesh position={[0, 0.22, 0.2]}>
        <boxGeometry args={[0.85, 0.04, 3.2]} />
        {mat(EDGE, 0.7, 0.45)}
      </mesh>

      {/* Landing gear */}
      <group position={[0, -0.05, 2.55]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.75, 8]} />
          <meshStandardMaterial color="#cfd4da" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.16, 14]} />
          <meshStandardMaterial color="#111" roughness={0.95} />
        </mesh>
      </group>
      {([-1, 1] as const).map((s) => (
        <group key={`mg${s}`} position={[s * 1.25, 0, -0.55]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.7, 8]} />
            <meshStandardMaterial color="#cfd4da" metalness={0.75} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.18, 14]} />
            <meshStandardMaterial color="#111" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Single exhaust */}
      <mesh castShadow position={[0, 0.55, -4.25]}>
        <cylinderGeometry args={[0.4, 0.5, 0.85, 16]} />
        {mat(EDGE, 0.75, 0.3)}
      </mesh>
      <mesh position={[0, 0.55, -4.7]}>
        <cylinderGeometry args={[0.36, 0.34, 0.28, 16]} />
        <meshStandardMaterial
          ref={nozzle}
          color={BURN}
          emissive={BURN}
          emissiveIntensity={staticModel ? 0.12 : 0.35}
          roughness={0.2}
          metalness={0.45}
        />
      </mesh>
      <group ref={fan} position={[0, 0.55, -3.7]}>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 14]} />
          <meshStandardMaterial color="#2b3035" metalness={0.7} />
        </mesh>
      </group>

      {!staticModel && afterburner > 0.08 && (
        <mesh position={[0, 0.55, -5.4 - afterburner * 0.8]} scale={[1, 1, 1 + afterburner * 1.4]}>
          <coneGeometry args={[0.32, 2.2 + afterburner * 2.5, 12]} />
          <meshStandardMaterial
            color="#ffd60a"
            emissive="#ff6b35"
            emissiveIntensity={1 + afterburner}
            transparent
            opacity={0.4 + afterburner * 0.35}
            depthWrite={false}
            roughness={1}
          />
        </mesh>
      )}

      {/* USAF-style wing roundels (simple) */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`star${s}`} position={[s * 3.2, 0.62, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 5]} />
          <meshStandardMaterial color={MARK} roughness={0.55} />
        </mesh>
      ))}

      {/* Nav lights */}
      <mesh position={[5.35, 0.58, -0.4]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-5.35, 0.58, -0.4]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, 0.55, 5.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}
