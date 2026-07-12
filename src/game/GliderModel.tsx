import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { useSailFabricMaps } from './pbrMaps'
import { PilotFigure } from './Pilot'

/** Classic Moroccan red sail with green pentagram. */
function makeSailBranding(): THREE.CanvasTexture {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!

  g.fillStyle = '#C1272D'
  g.fillRect(0, 0, size, size)

  for (let i = 0; i < 140; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.028})`
    g.beginPath()
    g.moveTo(0, (i / 140) * size)
    g.lineTo(size, (i / 140) * size)
    g.stroke()
  }
  for (let i = 1; i < 8; i++) {
    g.strokeStyle = 'rgba(0,0,0,0.16)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo((i / 8) * size, 0)
    g.lineTo((i / 8) * size, size)
    g.stroke()
  }

  const cx = size * 0.5
  const cy = size * 0.5
  const R = size * 0.26
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
  g.lineWidth = size * 0.032
  g.lineJoin = 'miter'
  g.stroke()
  g.restore()

  const edge = g.createRadialGradient(cx, cy, size * 0.15, cx, cy, size * 0.72)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.18)')
  g.fillStyle = edge
  g.fillRect(0, 0, size, size)

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
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 === 0 ? '#A32028' : '#7A181E'
    g.fillRect((i / 10) * size, 0, size / 10 + 1, size)
  }
  const cx = size * 0.5
  const cy = size * 0.5
  const R = size * 0.2
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
  g.lineWidth = size * 0.024
  g.stroke()
  g.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

type WingGrid = {
  geo: THREE.BufferGeometry
  rows: number
  cols: number
}

function createDeltaWingGeometry(): WingGrid {
  const rows = 20
  const cols = 32
  const span = 10.2
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const halfSpan = span * (0.1 + 0.9 * t)
    const z = -3.7 + t * 7.4
    const y = 0.82 * (1 - t * 0.3) + Math.sin(t * Math.PI) * 0.24
    for (let j = 0; j <= cols; j++) {
      const s = j / cols
      const x = (s - 0.5) * 2 * halfSpan
      const dihedral = Math.abs(s - 0.5) * 0.36
      const billow = Math.cos((s - 0.5) * Math.PI) * 0.18 * (1 - t * 0.4)
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
  return { geo, rows, cols }
}

function createLeadingEdgeCurve(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 36; i++) {
    const s = i / 36
    points.push(
      new THREE.Vector3((s - 0.5) * 10.2, 0.98 + Math.abs(s - 0.5) * 0.38, 3.55),
    )
  }
  return new THREE.CatmullRomCurve3(points)
}

function Tube({
  from,
  to,
  radius = 0.035,
  chrome = false,
}: {
  from: [number, number, number]
  to: [number, number, number]
  radius?: number
  chrome?: boolean
}) {
  const a = new THREE.Vector3(from[0], from[1], from[2])
  const b = new THREE.Vector3(to[0], to[1], to[2])
  const dir = b.sub(a)
  const len = Math.max(0.001, dir.length())
  const mid = a.clone().addScaledVector(dir, 0.5)
  const n = dir.normalize()
  const quat = new THREE.Quaternion()
  if (Math.abs(n.y) > 0.999) {
    quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), n.y > 0 ? 0 : Math.PI)
  } else {
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
  }
  return (
    <mesh position={mid} quaternion={quat} castShadow>
      <cylinderGeometry args={[radius, radius, len, 8]} />
      <meshPhysicalMaterial
        color={chrome ? '#cfd4da' : '#1a1c22'}
        roughness={chrome ? 0.2 : 0.25}
        metalness={0.92}
        clearcoat={0.45}
      />
    </mesh>
  )
}

interface GliderModelProps {
  barRef?: React.RefObject<THREE.Group | null>
  hidePilot?: boolean
  staticModel?: boolean
}

export function GliderModel({
  barRef: externalBarRef,
  hidePilot,
  staticModel = false,
}: GliderModelProps) {
  const barRef = externalBarRef
  const wingRef = useRef<THREE.Mesh>(null)
  const wing = useMemo(() => createDeltaWingGeometry(), [])
  const edgeCurve = useMemo(() => createLeadingEdgeCurve(), [])
  const sailMap = useMemo(() => makeSailBranding(), [])
  const bottomMap = useMemo(() => makeBottomSailTexture(), [])
  const fabric = useSailFabricMaps()
  const sailNormalScale = useMemo(() => new THREE.Vector2(0.75, 0.75), [])
  const sheenWhite = useMemo(() => new THREE.Color('#ffffff'), [])
  const smoothRoll = useRef(0)
  const smoothPitch = useRef(0)

  // No vertex morph — only heavily damped bank tilt (stops accel shake)
  useFrame((_, dt) => {
    const mesh = wingRef.current
    if (!mesh || staticModel) return
    const { flight } = useGameStore.getState()
    const k = 1 - Math.exp(-3.5 * dt)
    smoothRoll.current = THREE.MathUtils.lerp(smoothRoll.current, flight.roll, k)
    smoothPitch.current = THREE.MathUtils.lerp(smoothPitch.current, flight.pitch, k)
    mesh.rotation.z = smoothRoll.current * 0.02
    mesh.rotation.x = -smoothPitch.current * 0.01
  })

  return (
    <group>
      <mesh ref={wingRef} geometry={wing.geo} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={sailMap}
          normalMap={fabric.normalMap}
          normalScale={sailNormalScale}
          roughnessMap={fabric.roughnessMap}
          roughness={0.7}
          metalness={0.02}
          sheen={0.5}
          sheenRoughness={0.75}
          sheenColor={sheenWhite}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh geometry={wing.geo} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={bottomMap}
          roughness={0.85}
          metalness={0.02}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh castShadow position={[0, 0.92, 3.58]}>
        <sphereGeometry args={[0.16, 16, 14]} />
        <meshPhysicalMaterial color="#f8f9fa" metalness={0.4} roughness={0.28} clearcoat={0.5} />
      </mesh>

      <mesh castShadow>
        <tubeGeometry args={[edgeCurve, 48, 0.078, 12, false]} />
        <meshPhysicalMaterial color="#1a1c22" roughness={0.25} metalness={0.92} clearcoat={0.45} />
      </mesh>

      <mesh position={[0, 0.55, 0.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.042, 0.042, 9.5, 12]} />
        <meshPhysicalMaterial color="#1a1c22" roughness={0.25} metalness={0.92} />
      </mesh>

      <mesh position={[0, 1.35, 0.15]} castShadow>
        <cylinderGeometry args={[0.028, 0.032, 1.2, 10]} />
        <meshPhysicalMaterial color="#cfd4da" roughness={0.2} metalness={0.9} />
      </mesh>
      <Tube from={[0, 1.95, 0.15]} to={[4.4, 0.65, 1.1]} radius={0.007} chrome />
      <Tube from={[0, 1.95, 0.15]} to={[-4.4, 0.65, 1.1]} radius={0.007} chrome />
      <Tube from={[0, 1.95, 0.15]} to={[0, 0.7, 3.1]} radius={0.007} chrome />

      {[-3.5, -1.75, 0, 1.75, 3.5].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.85]} rotation={[0.1, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, 7.2, 5]} />
          <meshStandardMaterial color="#ced4da" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <Tube
          key={`fw${side}`}
          from={[side * 4.6, 0.55, 1.1]}
          to={[side * 0.55, -0.55, 0.15]}
          radius={0.01}
          chrome
        />
      ))}

      <mesh position={[0, 0.18, 0.2]} castShadow>
        <torusGeometry args={[0.085, 0.018, 8, 16]} />
        <meshPhysicalMaterial color="#d4a017" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.05, 0.2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.35, 8]} />
        <meshStandardMaterial color="#212529" roughness={0.5} />
      </mesh>

      <group ref={barRef} position={[0, -0.55, 0.15]}>
        <Tube from={[-0.02, 0.72, -0.05]} to={[-0.55, 0.02, 0.02]} radius={0.026} />
        <Tube from={[0.02, 0.72, -0.05]} to={[0.55, 0.02, 0.02]} radius={0.026} />
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0.02]} castShadow>
          <cylinderGeometry args={[0.034, 0.034, 1.22, 14]} />
          <meshPhysicalMaterial color="#111" metalness={0.55} roughness={0.35} clearcoat={0.3} />
        </mesh>
        {[-0.5, 0.5].map((x) => (
          <group key={x} position={[x, 0, 0.02]}>
            <mesh>
              <capsuleGeometry args={[0.052, 0.28, 5, 10]} />
              <meshStandardMaterial color="#264653" roughness={0.7} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshPhysicalMaterial color="#e9c46a" roughness={0.55} clearcoat={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      {!hidePilot && <PilotFigure />}
    </group>
  )
}
