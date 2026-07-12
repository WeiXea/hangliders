import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import type { FlightPhase, LandAction } from '../types/game'

/** Standing model: local Y=0 is soles of the feet. Hip height ≈ 0.98 */
export const PILOT_HIP = 0.98
export const PILOT_EYE = 1.62
export const PILOT_HEIGHT = 1.78

/** Stylized aviator — inspired by Tim Von Rueden / CG Cookie pilot look. */
const SKIN = '#e0a882'
const SKIN_SH = '#c98b68'
const SKIN_ROSE = '#d4896a'
const JACKET = '#6b3e2e'
const JACKET_LT = '#8a5340'
const JACKET_DK = '#4a2a1e'
const PANTS = '#5c4a3a'
const PANTS_DK = '#3d3228'
const BOOT = '#2a1c14'
const BOOT_SOLE = '#1a120c'
const GLOVE = '#3d2918'
const HELMET = '#4a3428'
const HELMET_DK = '#2e2118'
const SCARF = '#f2ebe0'
const GOGGLE = '#1a1a1a'
const LENS = '#3d5a6c'
const HARNESS = '#c1272d'
const SHIRT = '#d9c4a5'

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
    L: { thigh: 1.35, shin: 1.45, upperArm: 0.3, foreArm: 0.85, shoulderZ: 0.12 },
    R: { thigh: 1.35, shin: 1.45, upperArm: 0.3, foreArm: 0.85, shoulderZ: -0.12 },
    bob: 0,
    sway: 0,
    lean: 0.1,
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

/** PUBG-style rectangular ram-air canopy fabric (green + Moroccan star). */
function makeRamAirTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!

  g.fillStyle = '#2d8a3e'
  g.fillRect(0, 0, w, h)

  const cells = 9
  for (let i = 0; i < cells; i++) {
    const x0 = (i / cells) * w
    const x1 = ((i + 1) / cells) * w
    g.fillStyle = i % 2 === 0 ? '#348f45' : '#267a36'
    g.fillRect(x0, 0, x1 - x0 + 1, h)
    g.strokeStyle = 'rgba(0,0,0,0.28)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(x0, 0)
    g.lineTo(x0, h)
    g.stroke()
  }

  // Leading-edge dark band
  g.fillStyle = 'rgba(0,0,0,0.18)'
  g.fillRect(0, 0, w, h * 0.12)
  // Trailing edge stitch
  g.fillStyle = 'rgba(255,255,255,0.12)'
  g.fillRect(0, h * 0.88, w, h * 0.12)

  // Cross seams
  for (let j = 1; j < 4; j++) {
    g.strokeStyle = 'rgba(0,0,0,0.2)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(0, (j / 4) * h)
    g.lineTo(w, (j / 4) * h)
    g.stroke()
  }

  // Center Moroccan star accent
  const cx = w * 0.5
  const cy = h * 0.52
  const R = h * 0.28
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5
    const x = cx + Math.cos(a) * R
    const y = cy + Math.sin(a) * R
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
  g.strokeStyle = '#C1272D'
  g.lineWidth = 10
  g.lineJoin = 'miter'
  g.stroke()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Rectangular ram-air wing (PUBG-like), arched across span with open cells. */
function createRamAirCanopy(): THREE.BufferGeometry {
  const span = 5.6
  const chord = 2.35
  const cells = 9
  const chordSegs = 6
  const arch = 0.55
  const thick = 0.42

  const cols = cells + 1
  const rows = chordSegs + 1
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const point = (i: number, j: number, bottom: boolean) => {
    const u = i / cells
    const v = j / chordSegs
    const x = (u - 0.5) * span
    const z = (0.5 - v) * chord
    const archY = arch * (1 - (2 * u - 1) ** 2)
    const camber = Math.sin(v * Math.PI) * 0.22
    const y = archY + camber - (bottom ? thick * (0.55 + 0.45 * Math.sin(v * Math.PI)) : 0)
    return { x, y, z, u, v }
  }

  // Top surface
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = point(i, j, false)
      positions.push(p.x, p.y, p.z)
      uvs.push(p.u, 1 - p.v)
    }
  }
  // Bottom surface
  const botOff = cols * rows
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = point(i, j, true)
      positions.push(p.x, p.y, p.z)
      uvs.push(p.u, 1 - p.v)
    }
  }

  const quad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d)
  }

  for (let j = 0; j < chordSegs; j++) {
    for (let i = 0; i < cells; i++) {
      const a = j * cols + i
      const b = a + 1
      const c = (j + 1) * cols + i + 1
      const d = (j + 1) * cols + i
      quad(a, b, c, d)
      // Bottom — reverse winding for outward normals
      const a2 = botOff + a
      const b2 = botOff + b
      const c2 = botOff + c
      const d2 = botOff + d
      quad(a2, d2, c2, b2)
    }
  }

  // Trailing edge close
  for (let i = 0; i < cells; i++) {
    const a = chordSegs * cols + i
    const b = a + 1
    const a2 = botOff + a
    const b2 = botOff + b
    quad(a, b, b2, a2)
  }

  // Rib walls between cells (vertical)
  for (let i = 0; i <= cells; i++) {
    for (let j = 0; j < chordSegs; j++) {
      const t0 = j * cols + i
      const t1 = (j + 1) * cols + i
      const b0 = botOff + t0
      const b1 = botOff + t1
      if (i === 0) quad(t0, t1, b1, b0)
      else if (i === cells) quad(t0, b0, b1, t1)
      else {
        // Internal rib — double-sided via both windings omitted; single
        quad(t0, t1, b1, b0)
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function chuteLineEndpoints(cells = 9) {
  const span = 5.6
  const chord = 2.35
  const arch = 0.55
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= cells; i++) {
    const u = i / cells
    const x = (u - 0.5) * span
    const y = arch * (1 - (2 * u - 1) ** 2) - 0.35
    pts.push(new THREE.Vector3(x, y, chord * 0.35))
    pts.push(new THREE.Vector3(x, y - 0.05, -chord * 0.35))
  }
  return pts
}

type LineXform = { pos: THREE.Vector3; quat: THREE.Quaternion; len: number }

function buildLineXforms(tops: THREE.Vector3[], harness: THREE.Vector3): LineXform[] {
  const up = new THREE.Vector3(0, 1, 0)
  return tops.map((top) => {
    const dir = harness.clone().sub(top)
    const len = dir.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize())
    return { pos: top.clone().lerp(harness, 0.5), quat, len }
  })
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
  const fabricMap = useMemo(() => makeRamAirTexture(), [])
  const canopyGeo = useMemo(() => createRamAirCanopy(), [])
  const lineXforms = useMemo(
    () => buildLineXforms(chuteLineEndpoints(), new THREE.Vector3(0, -3.35, 0.15)),
    [],
  )
  const cellMouths = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const u = (i + 0.5) / 9
        const x = (u - 0.5) * 5.4
        const y = 0.55 * (1 - (2 * u - 1) ** 2) - 0.12
        return { x, y }
      }),
    [],
  )

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const o = smoothstep(inflationRef.current)
    const sw = swingRef.current
    const billow = 1 + Math.sin(t * 1.4) * 0.012 * o
    const pack = Math.max(0.08, o)
    group.current.scale.set(billow * pack, pack * 0.85 + 0.15, lerp(0.25, billow, o) * pack)
    group.current.rotation.z = sw * 0.4 + Math.sin(t * 1.1) * 0.015 * o
    group.current.rotation.x = 0.08 + Math.sin(t * 0.85) * 0.02 * o
    group.current.position.y = lerp(0.9, 3.55, o)
    group.current.visible = o > 0.02
  })

  return (
    <group ref={group} position={[0, 3.2, 0]}>
      <mesh geometry={canopyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={fabricMap}
          side={THREE.DoubleSide}
          roughness={0.78}
          metalness={0.02}
          sheen={0.35}
          sheenRoughness={0.7}
          sheenColor="#a8e6b0"
        />
      </mesh>

      {cellMouths.map((m, i) => (
        <mesh key={i} position={[m.x, m.y, 1.12]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.48, 0.28, 0.06]} />
          <meshStandardMaterial color="#0d2818" roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[-2.85, 0.15, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.08, 0.55, 1.8]} />
        <meshStandardMaterial color="#1f6b30" roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[2.85, 0.15, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.08, 0.55, 1.8]} />
        <meshStandardMaterial color="#1f6b30" roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {lineXforms.map((lx, i) => (
        <mesh key={i} position={lx.pos} quaternion={lx.quat}>
          <cylinderGeometry args={[0.008, 0.008, lx.len, 3]} />
          <meshStandardMaterial color="#e8ecef" roughness={0.55} />
        </mesh>
      ))}

      <mesh position={[0, -3.25, 0.15]}>
        <boxGeometry args={[0.22, 0.1, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.65} />
      </mesh>
      <mesh position={[-0.12, -3.45, 0.1]} rotation={[0.2, 0, 0.15]}>
        <cylinderGeometry args={[0.012, 0.012, 0.55, 4]} />
        <meshStandardMaterial color="#c1272d" roughness={0.7} />
      </mesh>
      <mesh position={[0.12, -3.45, 0.1]} rotation={[0.2, 0, -0.15]}>
        <cylinderGeometry args={[0.012, 0.012, 0.55, 4]} />
        <meshStandardMaterial color="#c1272d" roughness={0.7} />
      </mesh>
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

  const suit = suitColor ?? JACKET
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

    const hipBase =
      standing && landAction === 'sit'
        ? PILOT_HIP * 0.42
        : standing
          ? PILOT_HIP
          : 0
    // Never sink soles below local Y=0 while standing
    hips.current.position.y = hipBase + (standing ? Math.max(0, c.bob) : c.bob)
    hips.current.rotation.z = c.sway
    hips.current.rotation.y = c.sway * 0.3
    torso.current.rotation.x = c.lean
    root.current.rotation.x = c.rootX
    root.current.rotation.z = c.rootZ
  })

  if (hide) return null

  const hipW = 0.22
  const thighLen = 0.44
  const shinLen = 0.42

  return (
    <group ref={root}>
      <group ref={hips}>
        {/* Pelvis — pants */}
        <mesh position={[0, -0.02, 0]} castShadow scale={[1.08, 0.88, 0.95]}>
          <sphereGeometry args={[0.155, 16, 14]} />
          <meshStandardMaterial color={PANTS} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.165, 0.03, 8, 20]} />
          <meshStandardMaterial color={BOOT} roughness={0.7} />
        </mesh>

        <group ref={torso} position={[0, 0.3, 0]}>
          {/* Shirt under jacket */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <capsuleGeometry args={[0.155, 0.18, 8, 14]} />
            <meshStandardMaterial color={SHIRT} roughness={0.85} />
          </mesh>
          {/* Leather flight jacket torso */}
          <mesh position={[0, 0.22, 0.02]} castShadow scale={[1.2, 1.05, 1.12]}>
            <sphereGeometry args={[0.2, 18, 16]} />
            <meshStandardMaterial color={suit} roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.08, 0]} castShadow>
            <capsuleGeometry args={[0.19, 0.16, 8, 14]} />
            <meshStandardMaterial color={JACKET_DK} roughness={0.75} />
          </mesh>
          {/* Jacket lapels */}
          <mesh position={[-0.08, 0.34, 0.14]} rotation={[0.2, -0.35, -0.15]} castShadow>
            <boxGeometry args={[0.12, 0.22, 0.04]} />
            <meshStandardMaterial color={JACKET_LT} roughness={0.7} />
          </mesh>
          <mesh position={[0.08, 0.34, 0.14]} rotation={[0.2, 0.35, 0.15]} castShadow>
            <boxGeometry args={[0.12, 0.22, 0.04]} />
            <meshStandardMaterial color={JACKET_LT} roughness={0.7} />
          </mesh>
          {/* Cream scarf */}
          <mesh position={[0, 0.4, 0.06]} castShadow>
            <torusGeometry args={[0.12, 0.045, 8, 16]} />
            <meshStandardMaterial color={SCARF} roughness={0.9} />
          </mesh>
          <mesh position={[0.06, 0.28, 0.16]} rotation={[0.4, 0.2, 0.3]} castShadow>
            <boxGeometry args={[0.1, 0.28, 0.05]} />
            <meshStandardMaterial color={SCARF} roughness={0.9} />
          </mesh>
          {/* Shoulders / epaulettes */}
          <mesh position={[-0.26, 0.34, 0]} castShadow>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color={suit} roughness={0.72} />
          </mesh>
          <mesh position={[0.26, 0.34, 0]} castShadow>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color={suit} roughness={0.72} />
          </mesh>
          {/* Harness */}
          <mesh position={[0, 0.14, 0.17]} rotation={[0.12, 0, 0]}>
            <torusGeometry args={[0.2, 0.025, 6, 18]} />
            <meshStandardMaterial color={HARNESS} roughness={0.6} />
          </mesh>
          <mesh position={[-0.09, 0.06, 0.15]} rotation={[0.1, 0, 0.22]}>
            <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
            <meshStandardMaterial color={HARNESS} roughness={0.6} />
          </mesh>
          <mesh position={[0.09, 0.06, 0.15]} rotation={[0.1, 0, -0.22]}>
            <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
            <meshStandardMaterial color={HARNESS} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.1, 0.22]} castShadow>
            <boxGeometry args={[0.09, 0.055, 0.035]} />
            <meshPhysicalMaterial color="#c9a227" metalness={0.85} roughness={0.25} />
          </mesh>

          {/* Head — slightly larger stylized proportions */}
          <group position={[0, 0.55, 0.02]}>
            <mesh position={[0, -0.09, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.07, 0.1, 12]} />
              <meshPhysicalMaterial color={SKIN} roughness={0.5} sheen={0.3} sheenRoughness={0.55} />
            </mesh>
            {/* Soft rounded face */}
            <mesh castShadow scale={[1.05, 1.1, 1]}>
              <sphereGeometry args={[0.145, 20, 18]} />
              <meshPhysicalMaterial
                color={SKIN}
                roughness={0.42}
                sheen={0.4}
                sheenRoughness={0.5}
                sheenColor="#ffd6b8"
              />
            </mesh>
            <mesh position={[0, -0.05, 0.06]} castShadow scale={[0.9, 0.75, 0.85]}>
              <sphereGeometry args={[0.1, 14, 12]} />
              <meshPhysicalMaterial color={SKIN_SH} roughness={0.48} />
            </mesh>
            {/* Cheeks */}
            <mesh position={[-0.07, -0.01, 0.1]} castShadow>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshPhysicalMaterial color={SKIN_ROSE} roughness={0.5} />
            </mesh>
            <mesh position={[0.07, -0.01, 0.1]} castShadow>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshPhysicalMaterial color={SKIN_ROSE} roughness={0.5} />
            </mesh>
            {/* Nose */}
            <mesh position={[0, -0.01, 0.14]} castShadow>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshPhysicalMaterial color={SKIN_SH} roughness={0.5} />
            </mesh>
            {/* Soft smile */}
            <mesh position={[0, -0.06, 0.13]} rotation={[0.3, 0, 0]}>
              <torusGeometry args={[0.035, 0.008, 6, 12, Math.PI]} />
              <meshStandardMaterial color={SKIN_ROSE} roughness={0.6} />
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.045, 0.025, 0.125]}>
              <sphereGeometry args={[0.022, 10, 10]} />
              <meshStandardMaterial color="#2b2118" roughness={0.35} />
            </mesh>
            <mesh position={[0.045, 0.025, 0.125]}>
              <sphereGeometry args={[0.022, 10, 10]} />
              <meshStandardMaterial color="#2b2118" roughness={0.35} />
            </mesh>
            <mesh position={[-0.045, 0.03, 0.14]}>
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshStandardMaterial color="#fff" roughness={0.2} />
            </mesh>
            <mesh position={[0.045, 0.03, 0.14]}>
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshStandardMaterial color="#fff" roughness={0.2} />
            </mesh>
            {/* Ears */}
            <mesh position={[-0.14, 0, 0]} castShadow>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshPhysicalMaterial color={SKIN} roughness={0.5} />
            </mesh>
            <mesh position={[0.14, 0, 0]} castShadow>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshPhysicalMaterial color={SKIN} roughness={0.5} />
            </mesh>
            {/* Leather aviator helmet */}
            <mesh position={[0, 0.04, -0.02]} castShadow>
              <sphereGeometry args={[0.16, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
              <meshStandardMaterial color={HELMET} roughness={0.78} />
            </mesh>
            {/* Ear flaps */}
            <mesh position={[-0.13, -0.02, 0.02]} castShadow scale={[0.7, 1.1, 0.9]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial color={HELMET_DK} roughness={0.8} />
            </mesh>
            <mesh position={[0.13, -0.02, 0.02]} castShadow scale={[0.7, 1.1, 0.9]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial color={HELMET_DK} roughness={0.8} />
            </mesh>
            {/* Chin strap */}
            <mesh position={[0, -0.08, 0.08]} rotation={[0.5, 0, 0]}>
              <torusGeometry args={[0.1, 0.012, 6, 14]} />
              <meshStandardMaterial color={HELMET_DK} roughness={0.75} />
            </mesh>
            {/* Goggles on forehead */}
            <mesh position={[0, 0.08, 0.1]} rotation={[-0.35, 0, 0]} castShadow>
              <torusGeometry args={[0.09, 0.022, 8, 18]} />
              <meshStandardMaterial color={GOGGLE} roughness={0.45} metalness={0.35} />
            </mesh>
            <mesh position={[-0.045, 0.085, 0.12]} rotation={[-0.3, 0, 0]}>
              <cylinderGeometry args={[0.038, 0.038, 0.03, 12]} />
              <meshPhysicalMaterial
                color={LENS}
                transparent
                opacity={0.55}
                roughness={0.08}
                metalness={0.4}
                transmission={0.25}
              />
            </mesh>
            <mesh position={[0.045, 0.085, 0.12]} rotation={[-0.3, 0, 0]}>
              <cylinderGeometry args={[0.038, 0.038, 0.03, 12]} />
              <meshPhysicalMaterial
                color={LENS}
                transparent
                opacity={0.55}
                roughness={0.08}
                metalness={0.4}
                transmission={0.25}
              />
            </mesh>
          </group>

          {/* Left leg — khaki pants */}
          <group ref={thighL} position={[-hipW * 0.55, -0.3, 0]}>
            <mesh position={[0, -thighLen * 0.5, 0]} castShadow>
              <capsuleGeometry args={[0.09, thighLen * 0.55, 6, 12]} />
              <meshStandardMaterial color={PANTS} roughness={0.82} />
            </mesh>
            <mesh position={[0, -thighLen * 0.35, 0.08]}>
              <boxGeometry args={[0.1, 0.12, 0.04]} />
              <meshStandardMaterial color={PANTS_DK} roughness={0.85} />
            </mesh>
            <group ref={shinL} position={[0, -thighLen, 0]}>
              <mesh position={[0, -shinLen * 0.45, 0]} castShadow>
                <capsuleGeometry args={[0.072, shinLen * 0.5, 6, 12]} />
                <meshStandardMaterial color={PANTS_DK} roughness={0.84} />
              </mesh>
              <mesh position={[0, -shinLen * 0.92, 0.05]} castShadow>
                <boxGeometry args={[0.12, 0.12, 0.26]} />
                <meshStandardMaterial color={BOOT} roughness={0.85} />
              </mesh>
              <mesh position={[0, -shinLen * 1.02, 0.08]} castShadow>
                <boxGeometry args={[0.13, 0.04, 0.3]} />
                <meshStandardMaterial color={BOOT_SOLE} roughness={0.95} />
              </mesh>
            </group>
          </group>

          {/* Right leg */}
          <group ref={thighR} position={[hipW * 0.55, -0.3, 0]}>
            <mesh position={[0, -thighLen * 0.5, 0]} castShadow>
              <capsuleGeometry args={[0.09, thighLen * 0.55, 6, 12]} />
              <meshStandardMaterial color={PANTS} roughness={0.82} />
            </mesh>
            <mesh position={[0, -thighLen * 0.35, 0.08]}>
              <boxGeometry args={[0.1, 0.12, 0.04]} />
              <meshStandardMaterial color={PANTS_DK} roughness={0.85} />
            </mesh>
            <group ref={shinR} position={[0, -thighLen, 0]}>
              <mesh position={[0, -shinLen * 0.45, 0]} castShadow>
                <capsuleGeometry args={[0.072, shinLen * 0.5, 6, 12]} />
                <meshStandardMaterial color={PANTS_DK} roughness={0.84} />
              </mesh>
              <mesh position={[0, -shinLen * 0.92, 0.05]} castShadow>
                <boxGeometry args={[0.12, 0.12, 0.26]} />
                <meshStandardMaterial color={BOOT} roughness={0.85} />
              </mesh>
              <mesh position={[0, -shinLen * 1.02, 0.08]} castShadow>
                <boxGeometry args={[0.13, 0.04, 0.3]} />
                <meshStandardMaterial color={BOOT_SOLE} roughness={0.95} />
              </mesh>
            </group>
          </group>

          {/* Left arm — jacket sleeve */}
          <group ref={armL} position={[-0.28, 0.32, 0]}>
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.072, 0.24, 6, 12]} />
              <meshStandardMaterial color={suit} roughness={0.72} />
            </mesh>
            <group ref={foreL} position={[0, -0.38, 0]}>
              <mesh position={[0, -0.15, 0]} castShadow>
                <capsuleGeometry args={[0.06, 0.2, 6, 12]} />
                <meshStandardMaterial color={JACKET_LT} roughness={0.74} />
              </mesh>
              <mesh position={[0, -0.32, 0]} castShadow>
                <sphereGeometry args={[0.072, 12, 12]} />
                <meshStandardMaterial color={GLOVE} roughness={0.7} />
              </mesh>
            </group>
          </group>

          {/* Right arm */}
          <group ref={armR} position={[0.28, 0.32, 0]}>
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.072, 0.24, 6, 12]} />
              <meshStandardMaterial color={suit} roughness={0.72} />
            </mesh>
            <group ref={foreR} position={[0, -0.38, 0]}>
              <mesh position={[0, -0.15, 0]} castShadow>
                <capsuleGeometry args={[0.06, 0.2, 6, 12]} />
                <meshStandardMaterial color={JACKET_LT} roughness={0.74} />
              </mesh>
              <mesh position={[0, -0.32, 0]} castShadow>
                <sphereGeometry args={[0.072, 12, 12]} />
                <meshStandardMaterial color={GLOVE} roughness={0.7} />
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
