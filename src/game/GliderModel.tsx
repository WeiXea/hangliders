import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './gameStore'
import { useSailFabricMaps } from './pbrMaps'
import { PilotFigure } from './Pilot'

/** Multi-panel sport sail — original art, not a copy of any store asset. */
function makeSailBranding(): THREE.CanvasTexture {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!

  // Base white Dacron
  g.fillStyle = '#f4f1ea'
  g.fillRect(0, 0, size, size)

  // Leading-edge dark band
  g.fillStyle = '#1a1a1e'
  g.fillRect(0, 0, size, size * 0.12)

  // Red outboard panels
  g.fillStyle = '#c1272d'
  g.beginPath()
  g.moveTo(0, size * 0.12)
  g.lineTo(size * 0.28, size * 0.12)
  g.lineTo(size * 0.18, size)
  g.lineTo(0, size)
  g.fill()
  g.beginPath()
  g.moveTo(size, size * 0.12)
  g.lineTo(size * 0.72, size * 0.12)
  g.lineTo(size * 0.82, size)
  g.lineTo(size, size)
  g.fill()

  // Center navy stripe
  g.fillStyle = '#1d3557'
  g.fillRect(size * 0.42, size * 0.12, size * 0.16, size * 0.88)

  // Panel seams
  for (let i = 1; i < 10; i++) {
    const x = (i / 10) * size
    g.strokeStyle = 'rgba(0,0,0,0.14)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x, size * 0.12)
    g.lineTo(x, size)
    g.stroke()
  }
  for (let i = 1; i < 6; i++) {
    const y = size * 0.12 + (i / 6) * size * 0.88
    g.strokeStyle = 'rgba(0,0,0,0.1)'
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(size, y)
    g.stroke()
  }

  // Morocco star badge (keeps brand continuity)
  const cx = size * 0.5
  const cy = size * 0.48
  const R = size * 0.11
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
  g.lineWidth = size * 0.018
  g.stroke()
  g.restore()

  // Fabric grain
  for (let i = 0; i < 200; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.01 + Math.random() * 0.02})`
    g.beginPath()
    g.moveTo(0, Math.random() * size)
    g.lineTo(size, Math.random() * size)
    g.stroke()
  }

  // Trailing dirt
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(40,28,18,${0.03 + Math.random() * 0.06})`
    g.beginPath()
    g.ellipse(
      Math.random() * size,
      size * 0.75 + Math.random() * size * 0.25,
      10 + Math.random() * 30,
      4 + Math.random() * 12,
      0,
      0,
      Math.PI * 2,
    )
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
  g.fillStyle = '#d6d0c4'
  g.fillRect(0, 0, size, size)
  g.fillStyle = '#a11d24'
  g.fillRect(0, 0, size * 0.22, size)
  g.fillRect(size * 0.78, 0, size * 0.22, size)
  g.fillStyle = '#152238'
  g.fillRect(size * 0.4, 0, size * 0.2, size)
  for (let i = 1; i < 8; i++) {
    g.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'
    g.fillRect((i / 8) * size, 0, size / 8, size)
  }
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
  const rows = 40
  const cols = 64
  const span = 10.6
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const halfSpan = span * (0.08 + 0.92 * Math.pow(t, 0.92))
    const z = -3.85 + t * 7.6
    const y = 0.88 * (1 - t * 0.3) + Math.sin(t * Math.PI) * 0.26

    for (let j = 0; j <= cols; j++) {
      const s = j / cols
      const x = (s - 0.5) * 2 * halfSpan
      const dihedral = Math.abs(s - 0.5) * 0.4
      const billow = Math.cos((s - 0.5) * Math.PI) * 0.22 * (1 - t * 0.4)
      const tipWash = Math.pow(Math.abs(s - 0.5) * 2, 2.4) * 0.1 * t
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
  for (let i = 0; i <= 48; i++) {
    const s = i / 48
    points.push(
      new THREE.Vector3(
        (s - 0.5) * 10.6,
        1.02 + Math.abs(s - 0.5) * 0.42,
        3.62 - Math.abs(s - 0.5) * 0.18,
      ),
    )
  }
  return new THREE.CatmullRomCurve3(points)
}

function Tube({
  from,
  to,
  radius = 0.035,
  material,
}: {
  from: [number, number, number]
  to: [number, number, number]
  radius?: number
  material: THREE.Material
}) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const dir = b.clone().sub(a)
  const len = dir.length()
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  )

  return (
    <mesh position={mid} quaternion={quat} castShadow material={material}>
      <cylinderGeometry args={[radius, radius, len, 10]} />
    </mesh>
  )
}

/** Engine + prop pack behind the hang point — powered hang-glider look. */
function MotorPack({ spinning }: { spinning: boolean }) {
  const propRef = useRef<THREE.Group>(null)
  const discRef = useRef<THREE.Mesh>(null)

  useFrame((_, dt) => {
    if (!propRef.current) return
    const speed = spinning ? 42 : 0.4
    propRef.current.rotation.z += dt * speed
    if (discRef.current) {
      const mat = discRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = spinning ? 0.22 : 0.04
    }
  })

  return (
    <group position={[0, -0.15, -1.15]}>
      {/* Mount rails */}
      <mesh position={[0, 0.15, 0.35]} castShadow>
        <boxGeometry args={[0.35, 0.06, 0.9]} />
        <meshPhysicalMaterial color="#2b2d34" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Fuel tank */}
      <mesh position={[0, 0.05, 0.55]} castShadow>
        <capsuleGeometry args={[0.16, 0.35, 6, 12]} />
        <meshPhysicalMaterial color="#e63946" metalness={0.15} roughness={0.45} clearcoat={0.3} />
      </mesh>
      <mesh position={[0, 0.22, 0.55]}>
        <cylinderGeometry args={[0.04, 0.04, 0.08, 10]} />
        <meshStandardMaterial color="#212529" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Engine block */}
      <mesh position={[0, 0.08, 0.05]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.42]} />
        <meshPhysicalMaterial color="#343a40" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.28, 0.05]} castShadow>
        <boxGeometry args={[0.42, 0.08, 0.46]} />
        <meshPhysicalMaterial color="#212529" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cooling fins */}
      {[-0.12, -0.04, 0.04, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.1, -0.12]} castShadow>
          <boxGeometry args={[0.02, 0.22, 0.18]} />
          <meshStandardMaterial color="#495057" metalness={0.65} roughness={0.35} />
        </mesh>
      ))}

      {/* Exhaust */}
      <mesh position={[0.22, -0.02, -0.05]} rotation={[0.2, 0.4, 0.3]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.55, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Prop hub + blades */}
      <group ref={propRef} position={[0, 0.08, -0.35]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.12, 14]} />
          <meshPhysicalMaterial color="#adb5bd" metalness={0.85} roughness={0.25} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} castShadow>
            <mesh position={[0, 0.55, 0]} rotation={[0.15, 0, 0]}>
              <boxGeometry args={[0.1, 1.05, 0.02]} />
              <meshPhysicalMaterial color="#f8f9fa" metalness={0.1} roughness={0.35} />
            </mesh>
          </mesh>
        ))}
      </group>

      {/* Motion blur disc when spinning */}
      <mesh ref={discRef} position={[0, 0.08, -0.36]} rotation={[0, 0, 0]}>
        <circleGeometry args={[1.05, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Prop guard hoop */}
      <mesh position={[0, 0.08, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.08, 0.018, 8, 40]} />
        <meshStandardMaterial color="#868e96" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  )
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
        color: '#1a1c22',
        roughness: 0.22,
        metalness: 0.95,
        clearcoat: 0.55,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.2,
      }),
    [],
  )

  const chromeMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#cfd4da',
        roughness: 0.18,
        metalness: 0.95,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15,
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
    if (bottomRef.current) bottomRef.current.geometry = mesh.geometry
    mesh.rotation.z = roll * 0.06
    mesh.rotation.x = -pitch * 0.035 * spd
  })

  const phase = useGameStore((s) => s.flight.phase)
  const airspeed = useGameStore((s) => s.flight.airspeed)
  const spinning = (phase === 'flying' || phase === 'running') && airspeed > 6

  return (
    <group>
      {/* Sail */}
      <mesh ref={wingRef} geometry={wing.geo} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={sailMap}
          normalMap={fabric.normalMap}
          normalScale={new THREE.Vector2(0.9, 0.9)}
          roughnessMap={fabric.roughnessMap}
          roughness={0.68}
          metalness={0.02}
          sheen={0.6}
          sheenRoughness={0.7}
          sheenColor={new THREE.Color('#ffffff')}
          envMapIntensity={1}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh ref={bottomRef} geometry={wing.geo} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={bottomMap}
          normalMap={fabric.normalMap}
          roughnessMap={fabric.roughnessMap}
          roughness={0.82}
          metalness={0.02}
          sheen={0.35}
          sheenRoughness={0.8}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Nose cone */}
      <mesh castShadow position={[0, 0.95, 3.65]}>
        <sphereGeometry args={[0.2, 22, 20]} />
        <meshPhysicalMaterial
          color="#f8f9fa"
          metalness={0.5}
          roughness={0.22}
          clearcoat={0.75}
          clearcoatRoughness={0.15}
        />
      </mesh>
      <mesh position={[0, 0.95, 3.45]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.35, 14]} />
        <meshPhysicalMaterial color="#e9ecef" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Leading-edge spar */}
      <mesh castShadow>
        <tubeGeometry args={[edgeCurve, 72, 0.085, 16, false]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      {/* Crossbar */}
      <mesh position={[0, 0.58, 0.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.048, 0.048, 9.9, 18]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      {/* Kingpost + wires */}
      <mesh position={[0, 1.45, 0.15]} castShadow>
        <cylinderGeometry args={[0.03, 0.036, 1.35, 12]} />
        <primitive object={chromeMat} attach="material" />
      </mesh>
      <Tube from={[0, 2.1, 0.15]} to={[4.6, 0.7, 1.2]} radius={0.007} material={chromeMat} />
      <Tube from={[0, 2.1, 0.15]} to={[-4.6, 0.7, 1.2]} radius={0.007} material={chromeMat} />
      <Tube from={[0, 2.1, 0.15]} to={[0, 0.7, 3.2]} radius={0.007} material={chromeMat} />
      <Tube from={[0, 2.1, 0.15]} to={[0, 0.55, -2.2]} radius={0.007} material={chromeMat} />

      {/* Battens */}
      {[-4.5, -3.2, -1.9, -0.7, 0.7, 1.9, 3.2, 4.5].map((x) => (
        <mesh key={x} position={[x * 0.95, 0.65, 0.9]} rotation={[0.08, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, 7.4, 6]} />
          <meshStandardMaterial color="#dee2e6" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}

      {/* Tip wands */}
      {[-1, 1].map((side) => (
        <mesh
          key={`tip${side}`}
          position={[side * 5.0, 0.85, 2.8]}
          rotation={[0.2, side * 0.15, side * 0.4]}
          castShadow
        >
          <cylinderGeometry args={[0.025, 0.02, 1.4, 8]} />
          <primitive object={frameMat} attach="material" />
        </mesh>
      ))}

      {/* Side flying wires */}
      {[-1, 1].map((side) => (
        <Tube
          key={`fw${side}`}
          from={[side * 4.8, 0.55, 1.2]}
          to={[side * 0.55, -0.55, 0.15]}
          radius={0.01}
          material={chromeMat}
        />
      ))}

      {/* Hang strap + carabiner */}
      <mesh position={[0, 0.2, 0.2]} castShadow>
        <torusGeometry args={[0.09, 0.02, 10, 20]} />
        <meshPhysicalMaterial color="#d4a017" metalness={0.95} roughness={0.18} />
      </mesh>
      <mesh position={[0, -0.05, 0.2]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.4, 8]} />
        <meshStandardMaterial color="#212529" roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.28, 0.2]} castShadow>
        <torusGeometry args={[0.055, 0.014, 8, 16]} />
        <meshPhysicalMaterial color="#adb5bd" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* A-frame downtubes + base bar */}
      <group ref={barRef} position={[0, -0.55, 0.15]}>
        <Tube from={[-0.02, 0.75, -0.05]} to={[-0.58, 0.02, 0.02]} radius={0.028} material={frameMat} />
        <Tube from={[0.02, 0.75, -0.05]} to={[0.58, 0.02, 0.02]} radius={0.028} material={frameMat} />
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0.02]} castShadow>
          <cylinderGeometry args={[0.036, 0.036, 1.28, 18]} />
          <meshPhysicalMaterial color="#111" metalness={0.6} roughness={0.3} clearcoat={0.35} />
        </mesh>
        {/* Foam grips */}
        {[-0.52, 0.52].map((x) => (
          <group key={x} position={[x, 0, 0.02]}>
            <mesh>
              <capsuleGeometry args={[0.055, 0.28, 6, 12]} />
              <meshStandardMaterial color="#1b4332" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshPhysicalMaterial color="#e9c46a" roughness={0.5} clearcoat={0.25} />
            </mesh>
          </group>
        ))}
        {/* Corner brackets */}
        {[-0.62, 0.62].map((x) => (
          <mesh key={`br${x}`} position={[x, 0.02, 0.02]} castShadow>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshPhysicalMaterial color="#495057" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Small landing wheels under basebar */}
      {[-0.55, 0.55].map((x) => (
        <group key={`w${x}`} position={[x, -0.85, 0.15]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.11, 0.045, 10, 18]} />
            <meshStandardMaterial color="#212529" roughness={0.85} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
            <meshPhysicalMaterial color="#adb5bd" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.72, 0.15]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 1.1, 8]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <MotorPack spinning={spinning} />

      {!hidePilot && <PilotFigure />}
    </group>
  )
}
