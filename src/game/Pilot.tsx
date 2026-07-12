import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import type { FlightPhase, LandAction } from '../types/game'

/** Standing model: local Y=0 is soles of the feet. Hip height ≈ 0.98 */
export const PILOT_HIP = 0.98
export const PILOT_EYE = 1.62
export const PILOT_HEIGHT = 1.78

const SKIN = '#d4a574'
const SKIN_SH = '#c49364'
const SUIT = '#1e3a5f'
const SUIT_LT = '#2a4a6f'
const SUIT_DK = '#152538'
const BOOT = '#1a1512'
const GLOVE = '#3d5a6c'
const HELMET = '#e9c46a'
const HELMET_DK = '#c9a227'
const HARNESS = '#c1272d'

type PoseMode = 'prone' | 'stand' | 'freefall' | 'chute'

interface LimbPose {
  thigh: number
  shin: number
  upperArm: number
  foreArm: number
  shoulderZ: number
}

interface FullPose {
  L: LimbPose
  R: LimbPose
  bob: number
  sway: number
  lean: number
  rootX: number
  rootZ: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function gaitPose(phase: number, sprint: boolean): FullPose {
  const amp = sprint ? 0.9 : 0.68
  const armAmp = sprint ? 0.8 : 0.5
  return {
    L: {
      thigh: Math.sin(phase) * amp,
      shin: Math.max(0, -Math.sin(phase)) * (sprint ? 1.1 : 0.8) + 0.1,
      upperArm: -Math.sin(phase) * armAmp,
      foreArm: 0.4 + Math.max(0, Math.sin(phase)) * 0.4,
      shoulderZ: 0.12,
    },
    R: {
      thigh: Math.sin(phase + Math.PI) * amp,
      shin: Math.max(0, -Math.sin(phase + Math.PI)) * (sprint ? 1.1 : 0.8) + 0.1,
      upperArm: -Math.sin(phase + Math.PI) * armAmp,
      foreArm: 0.4 + Math.max(0, Math.sin(phase + Math.PI)) * 0.4,
      shoulderZ: -0.12,
    },
    bob: Math.abs(Math.sin(phase * 2)) * (sprint ? 0.05 : 0.03),
    sway: Math.sin(phase) * (sprint ? 0.05 : 0.03),
    lean: sprint ? 0.14 : 0.08,
    rootX: 0,
    rootZ: 0,
  }
}

function idlePose(t: number): FullPose {
  const breathe = Math.sin(t * 1.5) * 0.015
  return {
    L: { thigh: 0.03, shin: 0.06, upperArm: 0.15, foreArm: 0.3, shoulderZ: 0.1 },
    R: { thigh: 0.03, shin: 0.06, upperArm: 0.12, foreArm: 0.3, shoulderZ: -0.1 },
    bob: breathe,
    sway: Math.sin(t * 0.6) * 0.012,
    lean: 0,
    rootX: 0,
    rootZ: 0,
  }
}

function jumpPose(): FullPose {
  return {
    L: { thigh: -0.5, shin: 1.05, upperArm: -1.0, foreArm: 0.45, shoulderZ: 0.25 },
    R: { thigh: -0.45, shin: 1.0, upperArm: -0.95, foreArm: 0.45, shoulderZ: -0.25 },
    bob: 0.06,
    sway: 0,
    lean: -0.08,
    rootX: 0,
    rootZ: 0,
  }
}

function wavePose(t: number): FullPose {
  const base = idlePose(t)
  return {
    ...base,
    R: {
      thigh: 0.03,
      shin: 0.06,
      upperArm: -2.05,
      foreArm: 0.3 + Math.sin(t * 9) * 0.5,
      shoulderZ: -0.4,
    },
  }
}

function dancePose(t: number): FullPose {
  const beat = t * 6.5
  return {
    L: {
      thigh: Math.sin(beat) * 0.5,
      shin: 0.25 + Math.max(0, -Math.sin(beat)) * 0.65,
      upperArm: -0.75 + Math.sin(beat + 1) * 0.85,
      foreArm: 0.45 + Math.sin(beat * 2) * 0.35,
      shoulderZ: 0.28,
    },
    R: {
      thigh: Math.sin(beat + Math.PI) * 0.5,
      shin: 0.25 + Math.max(0, -Math.sin(beat + Math.PI)) * 0.65,
      upperArm: -0.75 + Math.sin(beat + 2) * 0.85,
      foreArm: 0.45 + Math.sin(beat * 2 + 1) * 0.35,
      shoulderZ: -0.28,
    },
    bob: 0.05 + Math.abs(Math.sin(beat * 2)) * 0.08,
    sway: Math.sin(beat) * 0.1,
    lean: 0.04,
    rootX: 0,
    rootZ: Math.sin(beat) * 0.1,
  }
}

function sitPose(): FullPose {
  return {
    L: { thigh: 1.3, shin: 1.4, upperArm: 0.3, foreArm: 0.85, shoulderZ: 0.12 },
    R: { thigh: 1.3, shin: 1.4, upperArm: 0.3, foreArm: 0.85, shoulderZ: -0.12 },
    bob: -0.38,
    sway: 0,
    lean: 0.12,
    rootX: 0,
    rootZ: 0,
  }
}

function hugPose(t: number): FullPose {
  const squeeze = 0.04 + Math.sin(t * 3) * 0.02
  return {
    L: {
      thigh: 0.08,
      shin: 0.12,
      upperArm: -1.15,
      foreArm: 1.35,
      shoulderZ: 0.55 + squeeze,
    },
    R: {
      thigh: 0.08,
      shin: 0.12,
      upperArm: -1.15,
      foreArm: 1.35,
      shoulderZ: -0.55 - squeeze,
    },
    bob: 0.02,
    sway: 0,
    lean: 0.18,
    rootX: 0.12,
    rootZ: 0,
  }
}

function highFivePose(t: number): FullPose {
  const clap = Math.sin(t * 10) * 0.12
  return {
    L: { thigh: 0.05, shin: 0.1, upperArm: 0.25, foreArm: 0.5, shoulderZ: 0.15 },
    R: {
      thigh: 0.05,
      shin: 0.1,
      upperArm: -2.55 + clap,
      foreArm: 0.15,
      shoulderZ: -0.15,
    },
    bob: 0.04,
    sway: 0,
    lean: -0.05,
    rootX: 0,
    rootZ: 0.05,
  }
}

function freefallPose(t: number): FullPose {
  const flutter = Math.sin(t * 7) * 0.07
  return {
    L: {
      thigh: -0.2 + flutter,
      shin: 0.3,
      upperArm: -1.55 + flutter,
      foreArm: 0.25,
      shoulderZ: 0.9,
    },
    R: {
      thigh: -0.2 - flutter,
      shin: 0.3,
      upperArm: -1.55 - flutter,
      foreArm: 0.25,
      shoulderZ: -0.9,
    },
    bob: 0,
    sway: Math.sin(t * 2) * 0.04,
    lean: 0,
    rootX: 0.3 + Math.sin(t * 2) * 0.04,
    rootZ: Math.sin(t * 1.4) * 0.07,
  }
}

function chutePose(t: number, swing: number, flare: boolean): FullPose {
  const toggle = Math.sin(t * 2.8) * 0.05
  return {
    L: {
      thigh: flare ? 0.5 : 0.32,
      shin: flare ? 0.8 : 0.5,
      upperArm: -2.25 + toggle,
      foreArm: 0.2,
      shoulderZ: 0.22,
    },
    R: {
      thigh: flare ? 0.48 : 0.3,
      shin: flare ? 0.75 : 0.48,
      upperArm: -2.2 - toggle,
      foreArm: 0.2,
      shoulderZ: -0.22,
    },
    bob: 0.02,
    sway: swing * 0.3,
    lean: flare ? 0.25 : 0.1,
    rootX: 0,
    rootZ: -swing * 0.55,
  }
}

/** Arms reach up to the control bar; body hangs below the wing. */
function pronePose(): FullPose {
  return {
    L: {
      thigh: 0.2,
      shin: 0.35,
      upperArm: -2.55,
      foreArm: 0.15,
      shoulderZ: 0.2,
    },
    R: {
      thigh: 0.18,
      shin: 0.32,
      upperArm: -2.55,
      foreArm: 0.15,
      shoulderZ: -0.2,
    },
    bob: 0,
    sway: 0,
    lean: 0.35,
    rootX: 0.15,
    rootZ: 0,
  }
}

function resolvePose(
  mode: PoseMode,
  phase: FlightPhase,
  speed: number,
  airborne: boolean,
  landAction: LandAction,
  sprint: boolean,
  swing: number,
  flare: boolean,
  t: number,
  gaitPhase: number,
): FullPose {
  if (mode === 'prone') return pronePose()
  if (mode === 'freefall' || phase === 'freefall') return freefallPose(t)
  if (mode === 'chute' || phase === 'parachuting') return chutePose(t, swing, flare)
  if (landAction === 'sit') return sitPose()
  if (landAction === 'wave') return wavePose(t)
  if (landAction === 'dance') return dancePose(t)
  if (landAction === 'hug') return hugPose(t)
  if (landAction === 'highfive') return highFivePose(t)
  if (airborne) return jumpPose()
  if (speed > 0.4) return gaitPose(gaitPhase, sprint || speed > 8)
  return idlePose(t)
}

function applyLimb(
  thigh: THREE.Group | null,
  shin: THREE.Group | null,
  upperArm: THREE.Group | null,
  foreArm: THREE.Group | null,
  pose: LimbPose,
  side: 1 | -1,
) {
  if (thigh) thigh.rotation.set(pose.thigh, 0, side * 0.03)
  if (shin) shin.rotation.set(pose.shin, 0, 0)
  if (upperArm) upperArm.rotation.set(pose.upperArm, 0, pose.shoulderZ)
  if (foreArm) foreArm.rotation.set(pose.foreArm, 0, 0)
}

export function ParachuteCanopy({
  inflation = 1,
  swing = 0,
}: {
  inflation?: number
  swing?: number
}) {
  const group = useRef<THREE.Group>(null)
  const inflationRef = useRef(inflation)
  const swingRef = useRef(swing)
  inflationRef.current = inflation
  swingRef.current = swing

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const o = smoothstep(inflationRef.current)
    const sw = swingRef.current
    const billow = 1 + Math.sin(t * 2.4) * 0.035 * o
    const pack = Math.max(0.12, o)
    group.current.scale.set(billow * pack, pack * 0.9 + 0.1, billow * pack)
    group.current.rotation.z = sw * 0.55 + Math.sin(t * 1.7) * 0.045 * o
    group.current.rotation.x = Math.sin(t * 1.1) * 0.05 * o
    group.current.position.y = lerp(0.8, 3.45, o)
    group.current.visible = o > 0.02
  })

  return (
    <group ref={group} position={[0, 3.2, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[2.45, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial
          color="#f4a261"
          side={THREE.DoubleSide}
          roughness={0.72}
          metalness={0.04}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.4, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color="#e76f51" side={THREE.BackSide} roughness={0.8} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 1.1, 0.35, Math.cos(a) * 1.1]} rotation={[0.2, a, 0]}>
            <planeGeometry args={[0.9, 1.6]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#e9c46a' : '#c1272d'}
              side={THREE.DoubleSide}
              transparent
              opacity={0.55}
              roughness={0.7}
            />
          </mesh>
        )
      })}
      <mesh position={[0, 0.55, 0]} rotation={[0.08, 0, 0]}>
        <torusGeometry args={[1.85, 0.07, 6, 36, Math.PI]} />
        <meshStandardMaterial color="#006233" roughness={0.7} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        const lx = Math.sin(a) * 1.6
        const lz = Math.cos(a) * 1.6
        return (
          <mesh
            key={i}
            position={[lx * 0.35, -1.7, lz * 0.35]}
            rotation={[0.2 + Math.abs(lz) * 0.05, 0, lx * 0.12]}
          >
            <cylinderGeometry args={[0.01, 0.01, 3.6, 3]} />
            <meshStandardMaterial color="#dee2e6" />
          </mesh>
        )
      })}
    </group>
  )
}

interface AnimatedPilotProps {
  mode?: PoseMode
  hide?: boolean
  /** Tint for remote player */
  suitColor?: string
  /** Override walk/run speed (for remote players) */
  motionSpeed?: number
  landAction?: LandAction
  chuteSwing?: number
  altitude?: number
  airborneY?: number
}

/**
 * Human-proportioned pilot. Standing: local Y=0 is feet.
 * Prone / freefall / chute: hips near local Y=0 (body-centered).
 */
export function AnimatedPilot({
  mode,
  hide,
  suitColor,
  motionSpeed,
  landAction: landActionProp,
  chuteSwing: chuteSwingProp,
  altitude: altitudeProp,
  airborneY,
}: AnimatedPilotProps) {
  const root = useRef<THREE.Group>(null)
  const hips = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const thighL = useRef<THREE.Group>(null)
  const shinL = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const foreL = useRef<THREE.Group>(null)
  const thighR = useRef<THREE.Group>(null)
  const shinR = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const foreR = useRef<THREE.Group>(null)

  const gait = useRef(0)
  const cur = useRef<FullPose>(idlePose(0))
  const flight = useGameStore((s) => s.flight)
  const input = useGameStore((s) => s.input)

  const poseMode: PoseMode =
    mode ??
    (flight.phase === 'parachuting'
      ? 'chute'
      : flight.phase === 'freefall'
        ? 'freefall'
        : flight.phase === 'walking'
          ? 'stand'
          : 'prone')

  const suit = suitColor ?? SUIT
  const standing = poseMode === 'stand'

  useFrame((_, dt) => {
    if (hide || !root.current || !hips.current || !torso.current) return

    const landAction = landActionProp ?? flight.landAction
    const chuteSwing = chuteSwingProp ?? flight.chuteSwing
    const altitude = altitudeProp ?? flight.altitude
    const walkSpeed = motionSpeed ?? (poseMode === 'stand' ? flight.airspeed : 0)
    const airborne =
      poseMode === 'stand' && (airborneY != null ? airborneY > 0.4 : flight.velocity.y > 0.4)
    const sprint = motionSpeed == null && input.speedUp && walkSpeed > 0.5
    const flare = poseMode === 'chute' && (input.pitchUp || altitude < 12)
    const t = performance.now() / 1000

    if (walkSpeed > 0.35 && landAction !== 'sit') {
      const cadence = sprint ? 11 : 8.2
      gait.current += dt * cadence * Math.min(1.35, walkSpeed / 6)
    }

    const target = resolvePose(
      poseMode,
      flight.phase,
      walkSpeed,
      airborne,
      landAction,
      sprint,
      chuteSwing,
      flare,
      t,
      gait.current,
    )

    const k = 1 - Math.pow(0.0008, dt)
    const c = cur.current
    const blendLimb = (a: LimbPose, b: LimbPose) => {
      a.thigh = lerp(a.thigh, b.thigh, k)
      a.shin = lerp(a.shin, b.shin, k)
      a.upperArm = lerp(a.upperArm, b.upperArm, k)
      a.foreArm = lerp(a.foreArm, b.foreArm, k)
      a.shoulderZ = lerp(a.shoulderZ, b.shoulderZ, k)
    }
    blendLimb(c.L, target.L)
    blendLimb(c.R, target.R)
    c.bob = lerp(c.bob, target.bob, k)
    c.sway = lerp(c.sway, target.sway, k)
    c.lean = lerp(c.lean, target.lean, k)
    c.rootX = lerp(c.rootX, target.rootX, k)
    c.rootZ = lerp(c.rootZ, target.rootZ, k)

    applyLimb(thighL.current, shinL.current, armL.current, foreL.current, c.L, -1)
    applyLimb(thighR.current, shinR.current, armR.current, foreR.current, c.R, 1)

    const hipBase = standing ? PILOT_HIP : 0
    hips.current.position.y = hipBase + c.bob
    hips.current.rotation.z = c.sway
    hips.current.rotation.y = c.sway * 0.3
    torso.current.rotation.x = c.lean
    root.current.rotation.x = c.rootX
    root.current.rotation.z = c.rootZ
  })

  if (hide) return null

  const hipW = 0.2
  const thighLen = 0.42
  const shinLen = 0.4

  return (
    <group ref={root}>
      <group ref={hips}>
        {/* Pelvis */}
        <mesh position={[0, -0.02, 0]} castShadow>
          <sphereGeometry args={[0.14, 14, 12]} />
          <meshStandardMaterial color={suit} roughness={0.72} metalness={0.04} />
        </mesh>

        <group ref={torso} position={[0, 0.28, 0]}>
          {/* Chest / abdomen — thicker than stick figure */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <capsuleGeometry args={[0.2, 0.36, 8, 14]} />
            <meshStandardMaterial color={suit} roughness={0.72} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0.22, 0.04]} castShadow>
            <sphereGeometry args={[0.22, 14, 12]} />
            <meshStandardMaterial color={SUIT_LT} roughness={0.7} metalness={0.04} />
          </mesh>
          {/* Shoulders */}
          <mesh position={[-0.22, 0.28, 0]} castShadow>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color={suit} roughness={0.72} metalness={0.04} />
          </mesh>
          <mesh position={[0.22, 0.28, 0]} castShadow>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color={suit} roughness={0.72} metalness={0.04} />
          </mesh>
          {/* Harness */}
          <mesh position={[0, 0.05, 0.16]} rotation={[0.12, 0, 0]}>
            <torusGeometry args={[0.2, 0.03, 6, 18]} />
            <meshStandardMaterial color={HARNESS} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.05, 0.14]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.35, 8]} />
            <meshStandardMaterial color={HARNESS} roughness={0.65} />
          </mesh>

          {/* Head + helmet — kept compact so it fits under the wing when prone */}
          <group position={[0, 0.48, 0.02]}>
            <mesh castShadow>
              <sphereGeometry args={[0.125, 16, 16]} />
              <meshPhysicalMaterial
                color={SKIN}
                roughness={0.48}
                metalness={0.0}
                sheen={0.4}
                sheenRoughness={0.55}
                sheenColor="#ffd6b8"
              />
            </mesh>
            <mesh position={[0, 0.02, 0.04]} castShadow>
              <sphereGeometry args={[0.08, 10, 10]} />
              <meshPhysicalMaterial color={SKIN_SH} roughness={0.52} sheen={0.3} sheenRoughness={0.6} />
            </mesh>
            <mesh position={[0, 0.035, 0]} castShadow>
              <sphereGeometry args={[0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshPhysicalMaterial
                color={HELMET}
                roughness={0.28}
                metalness={0.25}
                clearcoat={0.65}
                clearcoatRoughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0.02, 0.08]} rotation={[0.2, 0, 0]}>
              <sphereGeometry args={[0.095, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
              <meshPhysicalMaterial
                color="#1d3557"
                transparent
                opacity={0.45}
                roughness={0.08}
                metalness={0.55}
                transmission={0.15}
                thickness={0.4}
              />
            </mesh>
            <mesh position={[0, -0.04, 0.11]}>
              <torusGeometry args={[0.09, 0.022, 6, 14]} />
              <meshStandardMaterial color={HELMET_DK} roughness={0.85} />
            </mesh>
          </group>

          {/* Left leg */}
          <group ref={thighL} position={[-hipW * 0.55, -0.28, 0]}>
            <mesh position={[0, -thighLen * 0.5, 0]} castShadow>
              <capsuleGeometry args={[0.085, thighLen * 0.55, 6, 10]} />
              <meshStandardMaterial color={suit} roughness={0.8} />
            </mesh>
            <group ref={shinL} position={[0, -thighLen, 0]}>
              <mesh position={[0, -shinLen * 0.45, 0]} castShadow>
                <capsuleGeometry args={[0.07, shinLen * 0.5, 6, 10]} />
                <meshStandardMaterial color={SUIT_DK} roughness={0.82} />
              </mesh>
              <mesh position={[0, -shinLen * 0.95, 0.06]} castShadow>
                <boxGeometry args={[0.13, 0.09, 0.28]} />
                <meshStandardMaterial color={BOOT} roughness={0.9} />
              </mesh>
            </group>
          </group>

          {/* Right leg */}
          <group ref={thighR} position={[hipW * 0.55, -0.28, 0]}>
            <mesh position={[0, -thighLen * 0.5, 0]} castShadow>
              <capsuleGeometry args={[0.085, thighLen * 0.55, 6, 10]} />
              <meshStandardMaterial color={suit} roughness={0.8} />
            </mesh>
            <group ref={shinR} position={[0, -thighLen, 0]}>
              <mesh position={[0, -shinLen * 0.45, 0]} castShadow>
                <capsuleGeometry args={[0.07, shinLen * 0.5, 6, 10]} />
                <meshStandardMaterial color={SUIT_DK} roughness={0.82} />
              </mesh>
              <mesh position={[0, -shinLen * 0.95, 0.06]} castShadow>
                <boxGeometry args={[0.13, 0.09, 0.28]} />
                <meshStandardMaterial color={BOOT} roughness={0.9} />
              </mesh>
            </group>
          </group>

          {/* Left arm */}
          <group ref={armL} position={[-0.26, 0.26, 0]}>
            <mesh position={[0, -0.18, 0]} castShadow>
              <capsuleGeometry args={[0.065, 0.22, 6, 10]} />
              <meshStandardMaterial color={suit} roughness={0.72} metalness={0.04} />
            </mesh>
            <group ref={foreL} position={[0, -0.36, 0]}>
              <mesh position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.055, 0.18, 6, 10]} />
                <meshStandardMaterial color={SUIT_LT} roughness={0.78} />
              </mesh>
              <mesh position={[0, -0.3, 0]} castShadow>
                <sphereGeometry args={[0.065, 10, 10]} />
                <meshStandardMaterial color={GLOVE} roughness={0.72} />
              </mesh>
            </group>
          </group>

          {/* Right arm */}
          <group ref={armR} position={[0.26, 0.26, 0]}>
            <mesh position={[0, -0.18, 0]} castShadow>
              <capsuleGeometry args={[0.065, 0.22, 6, 10]} />
              <meshStandardMaterial color={suit} roughness={0.72} metalness={0.04} />
            </mesh>
            <group ref={foreR} position={[0, -0.36, 0]}>
              <mesh position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.055, 0.18, 6, 10]} />
                <meshStandardMaterial color={SUIT_LT} roughness={0.78} />
              </mesh>
              <mesh position={[0, -0.3, 0]} castShadow>
                <sphereGeometry args={[0.065, 10, 10]} />
                <meshStandardMaterial color={GLOVE} roughness={0.72} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/** Hang-glider prone pilot — shifted so the head stays under the sail. */
export function PilotFigure({ standing = false }: { standing?: boolean }) {
  if (standing) return <AnimatedPilot mode="stand" />
  return (
    <group position={[0, -1.45, 0.1]}>
      <AnimatedPilot mode="prone" />
    </group>
  )
}
