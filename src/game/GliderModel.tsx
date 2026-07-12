import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { useSailFabricMaps } from './pbrMaps'
import { PilotFigure } from './Pilot'

function makeSailBranding(): THREE.CanvasTexture {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!

  g.fillStyle = '#C1272D'
  g.fillRect(0, 0, size, size)

  for (let i = 0; i < 180; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.03})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, (i / 180) * size)
    g.lineTo(size, (i / 180) * size)
    g.stroke()
  }

  for (let i = 1; i < 8; i++) {
    const x = (i / 8) * size
    g.strokeStyle = 'rgba(0,0,0,0.18)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, size)
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
  g.stroke()
  g.restore()

  const edge = g.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.7)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.2)')
  g.fillStyle = edge
  g.fillRect(0, 0, size, size)

  g.fillStyle = 'rgba(255,255,255,0.1)'
  g.fillRect(0, 0, size, 28)

  for (let i = 0; i < 80; i++) {
    const x = Math.random() * size
    const y = size * 0.55 + Math.random() * size * 0.42
    g.fillStyle = `rgba(40,28,18,${0.04 + Math.random() * 0.08})`
    g.beginPath()
    g.ellipse(x, y, 8 + Math.random() * 28, 4 + Math.random() * 10, Math.random(), 0, Math.PI * 2)
    g.fill()
  }

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

/** Dense sail mesh — Phase B hero detail without external GLB. */
function createDeltaWingGeometry(): WingGrid {
  const rows = 34
  const cols = 56
  const span = 10.2
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const halfSpan = span * (0.1 + 0.9 * t)
    const z = -3.7 + t * 7.4
    const y = 0.82 * (1 - t * 0.32) + Math.sin(t * Math.PI) * 0.24

    for (let j = 0; j <= cols; j++) {
      const s = j / cols
      const x = (s - 0.5) * 2 * halfSpan
      const dihedral = Math.abs(s - 0.5) * 0.36
      const billow = Math.cos((s - 0.5) * Math.PI) * 0.2 * (1 - t * 0.42)
      const tipWash = Math.pow(Math.abs(s - 0.5) * 2, 2.2) * 0.08 * t
      positions.push(x, y + dihedral + billow - tipWash, z)
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
  for (let i = 0; i <= 40; i++) {
    const s = i / 40
    points.push(
      new THREE.Vector3(
        (s - 0.5) * 10.2,
        0.98 + Math.abs(s - 0.5) * 0.38,
        3.55 - Math.abs(s - 0.5) * 0.15,
      ),
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
  const sailMap = useMemo(() => makeSailBranding(), [])
  const bottomMap = useMemo(() => makeBottomSailTexture(), [])
  const fabric = useSailFabricMaps()
  const normalTick = useRef(0)

  const frameMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#1c1c24',
        roughness: 0.28,
        metalness: 0.92,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.1,
      }),
    [],
  )

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
        <meshPhysicalMaterial
          map={sailMap}
          normalMap={fabric.normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughnessMap={fabric.roughnessMap}
          roughness={0.72}
          metalness={0.02}
          sheen={0.55}
          sheenRoughness={0.72}
          sheenColor={new THREE.Color('#ffffff')}
          envMapIntensity={0.95}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh ref={bottomRef} geometry={wing.geo} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={bottomMap}
          normalMap={fabric.normalMap}
          roughnessMap={fabric.roughnessMap}
          roughness={0.85}
          metalness={0.02}
          sheen={0.35}
          sheenRoughness={0.8}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh castShadow position={[0, 0.92, 3.58]}>
        <sphereGeometry args={[0.17, 20, 18]} />
        <meshPhysicalMaterial
          color="#f1f3f5"
          metalness={0.45}
          roughness={0.28}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </mesh>

      <mesh castShadow>
        <tubeGeometry args={[edgeCurve, 64, 0.075, 14, false]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[0, 0.55, 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.042, 0.042, 9.6, 16]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[0, 1.35, 0.2]} castShadow>
        <cylinderGeometry args={[0.028, 0.032, 1.15, 10]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`kc${side}`}
          position={[side * 2.2, 1.05, 0.8]}
          rotation={[0.35, 0, side * -0.55]}
        >
          <cylinderGeometry args={[0.006, 0.006, 4.2, 5]} />
          <meshStandardMaterial color="#adb5bd" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}

      <mesh position={[0, 0.15, 0.25]} castShadow>
        <torusGeometry args={[0.08, 0.018, 8, 16]} />
        <meshPhysicalMaterial color="#c9a227" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.05, 0.25]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.35, 8]} />
        <meshStandardMaterial color="#212529" roughness={0.5} />
      </mesh>

      {[-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2].map((x) => (
        <mesh key={x} position={[x * 0.95, 0.62, 0.85]} rotation={[0.1, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, 7.6, 6]} />
          <meshStandardMaterial color="#ced4da" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 4.1, 0.2, 1]}
          rotation={[0.55, side * 0.22, side * 0.9]}
        >
          <cylinderGeometry args={[0.012, 0.012, 3.9, 6]} />
          <meshStandardMaterial color="#868e96" metalness={0.75} roughness={0.28} />
        </mesh>
      ))}

      <group ref={barRef} position={[0, -0.55, 0.15]}>
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x * 0.15, 0.35, -0.1]} rotation={[0.35, 0, x > 0 ? -0.25 : 0.25]}>
            <cylinderGeometry args={[0.022, 0.022, 0.9, 10]} />
            <meshPhysicalMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 1.25, 16]} />
          <meshPhysicalMaterial color="#111" metalness={0.55} roughness={0.35} clearcoat={0.3} />
        </mesh>
        {[-0.55, 0.55].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 0, 0.06]} rotation={[0.25, 0, x < 0 ? 0.35 : -0.35]}>
              <capsuleGeometry args={[0.055, 0.32, 6, 10]} />
              <meshStandardMaterial color="#264653" roughness={0.65} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.06, 14, 14]} />
              <meshPhysicalMaterial color="#e9c46a" roughness={0.55} clearcoat={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      {!hidePilot && <PilotFigure />}
    </group>
  )
}
