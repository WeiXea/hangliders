import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { PilotFigure } from './Pilot'

function makeSailTexture(): THREE.CanvasTexture {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!

  // Morocco flag red field
  g.fillStyle = '#C1272D'
  g.fillRect(0, 0, size, size)

  // Subtle fabric weave
  for (let i = 0; i < 120; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.03})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, (i / 120) * size)
    g.lineTo(size, (i / 120) * size)
    g.stroke()
  }
  for (let i = 0; i < 80; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.02})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo((i / 80) * size, 0)
    g.lineTo((i / 80) * size, size)
    g.stroke()
  }

  // Green pentagram (Seal of Solomon) — centered
  const cx = size * 0.5
  const cy = size * 0.52
  const R = size * 0.22
  g.save()
  g.translate(cx, cy)
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5
    const x = Math.cos(a) * R
    const y = Math.sin(a) * R
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
  g.strokeStyle = '#006233'
  g.lineWidth = size * 0.028
  g.lineJoin = 'miter'
  g.miterLimit = 2
  g.stroke()
  g.restore()

  // Soft vignette / sail edge darkening
  const edge = g.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.7)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.18)')
  g.fillStyle = edge
  g.fillRect(0, 0, size, size)

  // Leading-edge highlight strip
  g.fillStyle = 'rgba(255,255,255,0.12)'
  g.fillRect(0, 0, size, 28)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

function makeBottomSailTexture(): THREE.CanvasTexture {
  const size = 512
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#8B1E24'
  g.fillRect(0, 0, size, size)
  // Underside: darker Morocco red with battens
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 === 0 ? '#A32028' : '#7A181E'
    g.fillRect((i / 10) * size, 0, size / 10 + 1, size)
  }
  const cx = size * 0.5
  const cy = size * 0.52
  const R = size * 0.18
  g.save()
  g.translate(cx, cy)
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5
    const x = Math.cos(a) * R
    const y = Math.sin(a) * R
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
  g.strokeStyle = '#004d28'
  g.lineWidth = size * 0.022
  g.stroke()
  g.restore()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createDeltaWingGeometry(): THREE.BufferGeometry {
  const rows = 16
  const cols = 32
  const span = 10
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const halfSpan = span * (0.12 + 0.88 * t)
    const z = -3.6 + t * 7.2
    const y = 0.78 * (1 - t * 0.3) + Math.sin(t * Math.PI) * 0.2

    for (let j = 0; j <= cols; j++) {
      const s = j / cols
      const x = (s - 0.5) * 2 * halfSpan
      const dihedral = Math.abs(s - 0.5) * 0.32
      const billow = Math.cos((s - 0.5) * Math.PI) * 0.16 * (1 - t * 0.4)
      positions.push(x, y + dihedral + billow, z)
      uvs.push(s, t)
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + cols + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function createLeadingEdgeCurve(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 28; i++) {
    const s = i / 28
    points.push(
      new THREE.Vector3((s - 0.5) * 10, 0.95 + Math.abs(s - 0.5) * 0.35, 3.5),
    )
  }
  return new THREE.CatmullRomCurve3(points)
}

interface GliderModelProps {
  barRef?: React.RefObject<THREE.Group | null>
  /** Hide pilot when rendering as a parked prop (ParkedGliders adds its own) */
  hidePilot?: boolean
}

export function GliderModel({ barRef: externalBarRef, hidePilot }: GliderModelProps) {
  const barRef = externalBarRef
  const wingRef = useRef<THREE.Mesh>(null)
  const wingGeo = useMemo(() => createDeltaWingGeometry(), [])
  const edgeCurve = useMemo(() => createLeadingEdgeCurve(), [])
  const sailMap = useMemo(() => makeSailTexture(), [])
  const bottomMap = useMemo(() => makeBottomSailTexture(), [])

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1a2e',
        roughness: 0.25,
        metalness: 0.85,
      }),
    [],
  )

  // Soft sail billow from airspeed / pitch / roll (visual only)
  useFrame(() => {
    const mesh = wingRef.current
    if (!mesh) return
    const { flight } = useGameStore.getState()
    const spd = Math.min(1, flight.airspeed / 22)
    const billow = 1 + spd * 0.04 + Math.abs(flight.pitch) * 0.03
    const twist = flight.roll * 0.04
    mesh.scale.set(1 + Math.abs(twist) * 0.02, billow, 1)
    mesh.rotation.z = twist * 0.15
    mesh.rotation.x = -flight.pitch * 0.04 * spd
  })

  return (
    <group>
      <mesh ref={wingRef} geometry={wingGeo} castShadow receiveShadow>
        <meshStandardMaterial
          map={sailMap}
          roughness={0.72}
          metalness={0.04}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh geometry={wingGeo} castShadow receiveShadow>
        <meshStandardMaterial
          map={bottomMap}
          roughness={0.85}
          metalness={0.02}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Nose cone */}
      <mesh castShadow position={[0, 0.9, 3.55]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#f8f9fa" metalness={0.35} roughness={0.35} />
      </mesh>

      <mesh castShadow>
        <tubeGeometry args={[edgeCurve, 48, 0.08, 12, false]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[0, 0.55, 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 9.4, 14]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[0, 0.3, 2.3]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.3, 10]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      {[-4, -2, 0, 2, 4].map((x) => (
        <mesh key={x} position={[x * 0.95, 0.62, 0.9]} rotation={[0.12, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, 7.8, 6]} />
          <meshStandardMaterial color="#ced4da" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 4, 0.2, 1]}
          rotation={[0.55, side * 0.22, side * 0.9]}
        >
          <cylinderGeometry args={[0.015, 0.015, 3.8, 6]} />
          <meshStandardMaterial color="#868e96" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* A-frame / control bar */}
      <group ref={barRef} position={[0, -0.55, 0.15]}>
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x * 0.15, 0.35, -0.1]} rotation={[0.35, 0, x > 0 ? -0.25 : 0.25]}>
            <cylinderGeometry args={[0.022, 0.022, 0.9, 8]} />
            <meshStandardMaterial color="#212529" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1.2, 14]} />
          <meshStandardMaterial color="#111" metalness={0.5} roughness={0.4} />
        </mesh>
        {[-0.55, 0.55].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 0, 0.06]} rotation={[0.25, 0, x < 0 ? 0.35 : -0.35]}>
              <capsuleGeometry args={[0.055, 0.32, 4, 8]} />
              <meshStandardMaterial color="#264653" roughness={0.7} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color="#e9c46a" roughness={0.75} />
            </mesh>
          </group>
        ))}
      </group>

      {!hidePilot && <PilotFigure />}
    </group>
  )
}

