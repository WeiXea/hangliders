import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import type { FlightPhase, LandAction } from '../types/game'

const SKIN = '#e8b896'
const SUIT = '#1b263b'
const SUIT_DK = '#121820'
const BOOT = '#1a1a1a'
const GLOVE = '#264653'
const HELMET = '#e9c46a'

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
  const amp = sprint ? 0.95 : 0.72
  const armAmp = sprint ? 0.85 : 0.55
  return {
    L: {
      thigh: Math.sin(phase) * amp,
      shin: Math.max(0, -Math.sin(phase)) * (sprint ? 1.15 : 0.85) + 0.12,
      upperArm: -Math.sin(phase) * armAmp,
      foreArm: 0.35 + Math.max(0, Math.sin(phase)) * 0.45,
      shoulderZ: 0.1,
    },
    R: {
      thigh: Math.sin(phase + Math.PI) * amp,
      shin: Math.max(0, -Math.sin(phase + Math.PI)) * (sprint ? 1.15 : 0.85) + 0.12,
      upperArm: -Math.sin(phase + Math.PI) * armAmp,
      foreArm: 0.35 + Math.max(0, Math.sin(phase + Math.PI)) * 0.45,
      shoulderZ: -0.1,
    },
    bob: Math.abs(Math.sin(phase * 2)) * (sprint ? 0.07 : 0.045),
    sway: Math.sin(phase) * (sprint ? 0.06 : 0.04),
    lean: sprint ? 0.18 : 0.1,
    rootX: 0,
    rootZ: 0,
  }
}

function idlePose(t: number): FullPose {
  const breathe = Math.sin(t * 1.6) * 0.02
  return {
    L: { thigh: 0.04, shin: 0.08, upperArm: 0.12, foreArm: 0.25, shoulderZ: 0.08 },
    R: { thigh: 0.04, shin: 0.08, upperArm: 0.1, foreArm: 0.25, shoulderZ: -0.08 },
    bob: breathe,
    sway: Math.sin(t * 0.7) * 0.015,
    lean: 0,
    rootX: 0,
    rootZ: 0,
  }
}

function jumpPose(): FullPose {
  return {
    L: { thigh: -0.55, shin: 1.1, upperArm: -1.1, foreArm: 0.4, shoulderZ: 0.2 },
    R: { thigh: -0.5, shin: 1.05, upperArm: -1.05, foreArm: 0.4, shoulderZ: -0.2 },
    bob: 0.08,
    sway: 0,
    lean: -0.1,
    rootX: 0,
    rootZ: 0,
  }
}

function wavePose(t: number): FullPose {
  const base = idlePose(t)
  return {
    ...base,
    R: {
      thigh: 0.04,
      shin: 0.08,
      upperArm: -2.1,
      foreArm: 0.35 + Math.sin(t * 10) * 0.55,
      shoulderZ: -0.35,
    },
    bob: base.bob + 0.01,
  }
}

function dancePose(t: number): FullPose {
  const beat = t * 6.5
  return {
    L: {
      thigh: Math.sin(beat) * 0.55,
      shin: 0.3 + Math.max(0, -Math.sin(beat)) * 0.7,
      upperArm: -0.8 + Math.sin(beat + 1) * 0.9,
      foreArm: 0.5 + Math.sin(beat * 2) * 0.4,
      shoulderZ: 0.25,
    },
    R: {
      thigh: Math.sin(beat + Math.PI) * 0.55,
      shin: 0.3 + Math.max(0, -Math.sin(beat + Math.PI)) * 0.7,
      upperArm: -0.8 + Math.sin(beat + 2) * 0.9,
      foreArm: 0.5 + Math.sin(beat * 2 + 1) * 0.4,
      shoulderZ: -0.25,
    },
    bob: 0.06 + Math.abs(Math.sin(beat * 2)) * 0.1,
    sway: Math.sin(beat) * 0.12,
    lean: 0.05,
    rootX: 0,
    rootZ: Math.sin(beat) * 0.12,
  }
}

function sitPose(): FullPose {
  return {
    L: { thigh: 1.35, shin: 1.45, upperArm: 0.35, foreArm: 0.9, shoulderZ: 0.1 },
    R: { thigh: 1.35, shin: 1.45, upperArm: 0.35, foreArm: 0.9, shoulderZ: -0.1 },
    bob: -0.42,
    sway: 0,
    lean: 0.15,
    rootX: 0,
    rootZ: 0,
  }
}

function freefallPose(t: number): FullPose {
  const flutter = Math.sin(t * 8) * 0.08
  return {
    L: {
      thigh: -0.25 + flutter,
      shin: 0.35,
      upperArm: -1.6 + flutter,
      foreArm: 0.2,
      shoulderZ: 0.85,
    },
    R: {
      thigh: -0.25 - flutter,
      shin: 0.35,
      upperArm: -1.6 - flutter,
      foreArm: 0.2,
      shoulderZ: -0.85,
    },
    bob: 0,
    sway: Math.sin(t * 2.2) * 0.05,
    lean: 0,
    rootX: 0.35 + Math.sin(t * 2) * 0.05,
    rootZ: Math.sin(t * 1.5) * 0.08,
  }
}

function chutePose(t: number, swing: number, flare: boolean): FullPose {
  const toggle = Math.sin(t * 3) * 0.06
  return {
    L: {
      thigh: flare ? 0.55 : 0.35,
      shin: flare ? 0.85 : 0.55,
      upperArm: -2.35 + toggle,
      foreArm: 0.15,
      shoulderZ: 0.2,
    },
    R: {
      thigh: flare ? 0.5 : 0.32,
      shin: flare ? 0.8 : 0.5,
      upperArm: -2.3 - toggle,
      foreArm: 0.15,
      shoulderZ: -0.2,
    },
    bob: 0.02,
    sway: swing * 0.35,
    lean: flare ? 0.28 : 0.12,
    rootX: 0,
    rootZ: -swing * 0.65,
  }
}

function pronePose(): FullPose {
  return {
    L: { thigh: 0.15, shin: 0.25, upperArm: -1.55, foreArm: 0.55, shoulderZ: 0.15 },
    R: { thigh: 0.12, shin: 0.22, upperArm: -1.55, foreArm: 0.55, shoulderZ: -0.15 },
    bob: 0,
    sway: 0,
    lean: 0.05,
    rootX: 0,
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
  if (thigh) thigh.rotation.set(pose.thigh, 0, side * 0.04)
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
}

export function AnimatedPilot({ mode, hide }: AnimatedPilotProps) {
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

  useFrame((_, dt) => {
    if (hide || !root.current || !hips.current || !torso.current) return

    const { phase, airspeed, velocity, landAction, chuteSwing, altitude } = flight
    const speed = phase === 'walking' ? airspeed : 0
    const airborne = phase === 'walking' && velocity.y > 0.4
    const sprint = input.speedUp && speed > 0.5
    const flare = phase === 'parachuting' && (input.pitchUp || altitude < 12)
    const t = performance.now() / 1000

    if (speed > 0.35 && landAction !== 'sit') {
      const cadence = sprint ? 11 : 8.2
      gait.current += dt * cadence * Math.min(1.35, speed / 6)
    }

    const target = resolvePose(
      poseMode,
      phase,
      speed,
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

    hips.current.position.y = c.bob
    hips.current.rotation.z = c.sway
    hips.current.rotation.y = c.sway * 0.35
    torso.current.rotation.x = c.lean
    root.current.rotation.x = c.rootX
    root.current.rotation.z = c.rootZ
  })

  if (hide) return null

  return (
    <group ref={root} position={[0, poseMode === 'stand' ? 0 : 0.1, 0]}>
      <group ref={hips}>
        <group ref={torso} position={[0, 0.55, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.16, 0.38, 6, 12]} />
            <meshStandardMaterial color={SUIT} roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.05, 0.12]} rotation={[0.1, 0, 0]}>
            <torusGeometry args={[0.17, 0.025, 6, 16]} />
            <meshStandardMaterial color="#c1272d" roughness={0.7} />
          </mesh>

          <group position={[0, 0.42, 0.02]}>
            <mesh castShadow>
              <sphereGeometry args={[0.135, 16, 16]} />
              <meshStandardMaterial color={SKIN} roughness={0.72} />
            </mesh>
            <mesh position={[0, 0.04, 0]} castShadow>
              <sphereGeometry args={[0.145, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={HELMET} roughness={0.55} metalness={0.15} />
            </mesh>
            <mesh position={[0, -0.02, 0.12]}>
              <torusGeometry args={[0.1, 0.025, 6, 14]} />
              <meshStandardMaterial color="#222" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.02, 0.1]} rotation={[0.15, 0, 0]}>
              <sphereGeometry args={[0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
              <meshStandardMaterial
                color="#1d3557"
                transparent
                opacity={0.35}
                roughness={0.2}
                metalness={0.4}
              />
            </mesh>
          </group>

          <group ref={thighL} position={[-0.13, 0, 0]}>
            <mesh position={[0, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
              <meshStandardMaterial color={SUIT} roughness={0.82} />
            </mesh>
            <group ref={shinL} position={[0, -0.42, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.055, 0.26, 4, 8]} />
                <meshStandardMaterial color={SUIT_DK} roughness={0.85} />
              </mesh>
              <mesh position={[0, -0.4, 0.04]} castShadow>
                <boxGeometry args={[0.11, 0.08, 0.24]} />
                <meshStandardMaterial color={BOOT} roughness={0.92} />
              </mesh>
            </group>
          </group>
          <group ref={armL} position={[-0.22, 0.32, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.2, 4, 8]} />
              <meshStandardMaterial color={SUIT} roughness={0.8} />
            </mesh>
            <group ref={foreL} position={[0, -0.32, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.042, 0.16, 4, 8]} />
                <meshStandardMaterial color={SUIT} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.26, 0]} castShadow>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color={GLOVE} roughness={0.75} />
              </mesh>
            </group>
          </group>

          <group ref={thighR} position={[0.13, 0, 0]}>
            <mesh position={[0, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
              <meshStandardMaterial color={SUIT} roughness={0.82} />
            </mesh>
            <group ref={shinR} position={[0, -0.42, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.055, 0.26, 4, 8]} />
                <meshStandardMaterial color={SUIT_DK} roughness={0.85} />
              </mesh>
              <mesh position={[0, -0.4, 0.04]} castShadow>
                <boxGeometry args={[0.11, 0.08, 0.24]} />
                <meshStandardMaterial color={BOOT} roughness={0.92} />
              </mesh>
            </group>
          </group>
          <group ref={armR} position={[0.22, 0.32, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.2, 4, 8]} />
              <meshStandardMaterial color={SUIT} roughness={0.8} />
            </mesh>
            <group ref={foreR} position={[0, -0.32, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.042, 0.16, 4, 8]} />
                <meshStandardMaterial color={SUIT} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.26, 0]} castShadow>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color={GLOVE} roughness={0.75} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

export function PilotFigure({ standing = false }: { standing?: boolean }) {
  return <AnimatedPilot mode={standing ? 'stand' : 'prone'} />
}
