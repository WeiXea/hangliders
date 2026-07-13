import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STEALTH = '#6c757d'
const STEALTH_DK = '#495057'
const STEALTH_LT = '#adb5bd'
const CANOPY = '#1a1a2e'
const INTAKE = '#212529'
const MARKING = '#f8f9fa'
const AFTERBURN = '#ff6b35'

/**
 * Procedural F-35A — stealth gray, delta wing, V-tail, single nozzle.
 * Oriented nose +Z (matches game craft convention).
 */
export function JetModel({
  staticModel = false,
  afterburner = 0,
}: {
  staticModel?: boolean
  /** 0–1 exhaust glow intensity while thrusting */
  afterburner?: number
}) {
  const nozzle = useRef<THREE.MeshStandardMaterial>(null)
  const fan = useRef<THREE.Group>(null)

  useFrame((state, dt) => {
    if (staticModel) return
    if (fan.current) fan.current.rotation.z += dt * Math.PI * 2 * (8 + afterburner * 14)
    if (nozzle.current) {
      const pulse = 0.35 + afterburner * 1.4 + Math.sin(state.clock.elapsedTime * 28) * 0.08 * afterburner
      nozzle.current.emissiveIntensity = pulse
    }
  })

  return (
    <group>
      {/* Main fuselage — long stealth lozenge */}
      <mesh castShadow position={[0, 0.55, 0.2]}>
        <capsuleGeometry args={[0.55, 7.2, 8, 16]} />
        <meshStandardMaterial color={STEALTH} roughness={0.42} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[0, 0.62, 0.15]}>
        <boxGeometry args={[1.15, 0.55, 7.6]} />
        <meshStandardMaterial color={STEALTH} roughness={0.4} metalness={0.55} />
      </mesh>

      {/* Nose cone */}
      <mesh castShadow position={[0, 0.52, 4.35]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.48, 1.6, 12]} />
        <meshStandardMaterial color={STEALTH_LT} roughness={0.35} metalness={0.6} />
      </mesh>
      {/* Pitot / EO sensor bump */}
      <mesh position={[0, 0.35, 4.55]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#212529" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Cockpit canopy */}
      <mesh castShadow position={[0, 1.05, 1.85]}>
        <sphereGeometry args={[0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color={CANOPY}
          transparent
          opacity={0.55}
          roughness={0.08}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.95, 1.7]}>
        <boxGeometry args={[0.7, 0.35, 1.4]} />
        <meshStandardMaterial color={STEALTH_DK} roughness={0.45} metalness={0.5} />
      </mesh>

      {/* Diverterless intakes */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`in${side}`}
          castShadow
          position={[side * 0.72, 0.35, 0.9]}
          rotation={[0.15, side * 0.35, side * 0.12]}
        >
          <boxGeometry args={[0.55, 0.45, 1.8]} />
          <meshStandardMaterial color={INTAKE} roughness={0.55} metalness={0.35} />
        </mesh>
      ))}

      {/* Delta wing */}
      <mesh castShadow position={[0, 0.48, -0.4]} rotation={[0.02, 0, 0]}>
        <boxGeometry args={[9.6, 0.12, 3.4]} />
        <meshStandardMaterial color={STEALTH} roughness={0.4} metalness={0.55} />
      </mesh>
      {/* Wing leading-edge bevels */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`le${side}`}
          castShadow
          position={[side * 3.6, 0.5, 0.85]}
          rotation={[0, side * 0.55, 0]}
        >
          <boxGeometry args={[2.8, 0.1, 1.2]} />
          <meshStandardMaterial color={STEALTH_DK} roughness={0.42} metalness={0.5} />
        </mesh>
      ))}

      {/* V-tails */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`vt${side}`}
          castShadow
          position={[side * 1.15, 1.15, -2.9]}
          rotation={[0.05, 0, side * 0.45]}
        >
          <boxGeometry args={[0.1, 1.55, 1.7]} />
          <meshStandardMaterial color={STEALTH} roughness={0.4} metalness={0.55} />
        </mesh>
      ))}

      {/* Horizontal stabilators */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`hs${side}`}
          castShadow
          position={[side * 1.6, 0.45, -3.5]}
          rotation={[0, side * 0.2, 0]}
        >
          <boxGeometry args={[2.2, 0.08, 1.1]} />
          <meshStandardMaterial color={STEALTH_DK} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}

      {/* Landing gear (static / parked look — always shown slightly) */}
      <mesh castShadow position={[0, -0.15, 2.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
        <meshStandardMaterial color="#ced4da" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, -0.5, 2.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.18, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={`mg${side}`} position={[side * 1.1, -0.1, -0.6]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.65, 8]} />
            <meshStandardMaterial color="#ced4da" metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.2, 12]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Single engine nozzle */}
      <mesh castShadow position={[0, 0.5, -4.05]}>
        <cylinderGeometry args={[0.42, 0.48, 0.7, 14]} />
        <meshStandardMaterial color={STEALTH_DK} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, -4.45]}>
        <cylinderGeometry args={[0.38, 0.36, 0.25, 14]} />
        <meshStandardMaterial
          ref={nozzle}
          color={AFTERBURN}
          emissive={AFTERBURN}
          emissiveIntensity={staticModel ? 0.15 : 0.4}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>
      {/* Exhaust plume (scales with afterburner via opacity via always-on soft cone) */}
      {!staticModel && afterburner > 0.05 && (
        <mesh position={[0, 0.5, -5.2 - afterburner]} scale={[1, 1, 1 + afterburner]}>
          <coneGeometry args={[0.35, 1.8 + afterburner * 2.2, 10]} />
          <meshStandardMaterial
            color="#ffd60a"
            emissive="#ff6b35"
            emissiveIntensity={0.8 + afterburner}
            transparent
            opacity={0.35 + afterburner * 0.4}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Spinner / fan disc (visual only) */}
      <group ref={fan} position={[0, 0.5, -3.55]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.08, 12]} />
          <meshStandardMaterial color="#343a40" metalness={0.6} />
        </mesh>
      </group>

      {/* National star marking (simple) */}
      <mesh position={[2.8, 0.56, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 5]} />
        <meshStandardMaterial color={MARKING} roughness={0.6} />
      </mesh>
      <mesh position={[-2.8, 0.56, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 5]} />
        <meshStandardMaterial color={MARKING} roughness={0.6} />
      </mesh>

      {/* Nav lights */}
      <mesh position={[4.7, 0.52, -0.3]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-4.7, 0.52, -0.3]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 0.55, -3.9]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#fff3bf" emissive="#fff3bf" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}
