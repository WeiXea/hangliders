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

  g.fillStyle = '#C1272D'
  g.fillRect(0, 0, size, size)

  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.035})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, (i / 160) * size)
    g.lineTo(size, (i / 160) * size)
    g.stroke()
  }
  for (let i = 0; i < 100; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.012 + Math.random() * 0.02})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo((i / 100) * size, 0)
    g.lineTo((i / 100) * size, size)
    g.stroke()
  }

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

  const edge = g.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.7)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.18)')
  g.fillStyle = edge
  g.fillRect(0, 0, size, size)

  g.fillStyle = 'rgba(255,255,255,0.12)'
  g.fillRect(0, 0, size, 28)

  // Dirt / wear along trailing edge and tips
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * size
    const y = size * 0.55 + Math.random() * size * 0.42
    g.fillStyle = `rgba(40,28,18,${0.04 + Math.random() * 0.08})`
    g.beginPath()
    g.ellipse(x, y, 8 + Math.random() * 28, 4 + Math.random() * 10, Math.random(), 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = 'rgba(20,30,40,0.1)'
  g.fillRect(0, size * 0.88, size, size * 0.12)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

function makeSailNormalMap(): THREE.CanvasTexture {
  const size = 512
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  // Flat normal base
  g.fillStyle = '#8080ff'
  g.fillRect(0, 0, size, size)
  // Fabric weave bumps
  for (let y = 0; y < size; y += 3) {
    const n = 128 + Math.sin(y * 0.4) * 18
    g.fillStyle = `rgb(${n * 0.85},${n * 0.85},${200 + (n - 128) * 0.3})`
    g.fillRect(0, y, size, 2)
  }
  for (let x = 0; x < size; x += 4) {
    g.fillStyle = `rgba(140,140,220,${0.08 + (x % 8) * 0.01})`
    g.fillRect(x, 0, 1, size)
  }
  // Soft panel seams
  for (let i = 1; i < 8; i++) {
    const x = (i / 8) * size
    g.strokeStyle = 'rgba(90,90,180,0.35)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, size)
    g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
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

type WingGrid = {
  geo: THREE.BufferGeometry
  base: Float32Array
  rows: number
  cols: number
}

function createDeltaWingGeometry(): WingGrid {
  const rows = 22
  const cols = 40
  const span = 10
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const halfSpan = span * (0.12 + 0.88 * t)
    const z = -3.6 + t * 7.2
    const y = 0.78 * (1 - t * 0.3) + Math.sin(t * Math.PI) * 0.22

    for (let j = 0; j <= cols; j++) {
      const s = j / cols
      const x = (s - 0.5) * 2 * halfSpan
      const dihedral = Math.abs(s - 0.5) * 0.34
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
  const base = new Float32Array(positions)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return { geo, base, rows, cols }
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
  hidePilot?: boolean
}

export function GliderModel({ barRef: externalBarRef, hidePilot }: GliderModelProps) {
  const barRef = externalBarRef
  const wingRef = useRef<THREE.Mesh>(null)
  const bottomRef = useRef<THREE.Mesh>(null)
  const wing = useMemo(() => createDeltaWingGeometry(), [])
  const edgeCurve = useMemo(() => createLeadingEdgeCurve(), [])
  const sailMap = useMemo(() => makeSailTexture(), [])
  const sailNormal = useMemo(() => makeSailNormalMap(), [])
  const bottomMap = useMemo(() => makeBottomSailTexture(), [])
  const normalTick = useRef(0)

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1a2e',
        roughness: 0.25,
        metalness: 0.85,
      }),
    [],
  )

  // Vertex morph: fabric billow + wing flex from airspeed / weight-shift
  useFrame(({ clock }) => {
    const mesh = wingRef.current
    if (!mesh) return
    const { flight } = useGameStore.getState()
    const spd = Math.min(1, flight.airspeed / 22)
    const flying = flight.phase === 'flying' || flight.phase === 'running'
    const t = clock.elapsedTime
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute
    const { base, rows, cols } = wing
    const roll = flight.roll
    const pitch = flight.pitch

    for (let i = 0; i <= rows; i++) {
      const rowT = i / rows
      for (let j = 0; j <= cols; j++) {
        const s = j / cols
        const idx = (i * (cols + 1) + j) * 3
        const bx = base[idx]
        const by = base[idx + 1]
        const bz = base[idx + 2]
        const spanFade = Math.cos((s - 0.5) * Math.PI)
        const press = flying ? spd * 0.14 * spanFade * (1 - rowT * 0.35) : 0.02
        const flex = roll * (s - 0.5) * 0.55 * rowT
        const flutter =
          flying && Math.abs(s - 0.5) > 0.35
            ? Math.sin(t * 14 + s * 8 + bz) * 0.012 * spd
            : 0
        const wash = -pitch * Math.abs(s - 0.5) * 0.12 * rowT
        pos.array[idx] = bx
        pos.array[idx + 1] = by + press + flex + flutter
        pos.array[idx + 2] = bz + wash * 0.4
      }
    }
    pos.needsUpdate = true
    normalTick.current += 1
    if (normalTick.current % 3 === 0) mesh.geometry.computeVertexNormals()
    if (bottomRef.current) {
      bottomRef.current.geometry = mesh.geometry
    }
    mesh.rotation.z = roll * 0.06
    mesh.rotation.x = -pitch * 0.035 * spd
  })

  return (
    <group>
      <mesh ref={wingRef} geometry={wing.geo} castShadow receiveShadow>
        <meshStandardMaterial
          map={sailMap}
          normalMap={sailNormal}
          normalScale={new THREE.Vector2(0.55, 0.55)}
          roughness={0.62}
          metalness={0.06}
          envMapIntensity={0.85}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh ref={bottomRef} geometry={wing.geo} castShadow receiveShadow>
        <meshStandardMaterial
          map={bottomMap}
          roughness={0.82}
          metalness={0.03}
          side={THREE.BackSide}
        />
      </mesh>

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
