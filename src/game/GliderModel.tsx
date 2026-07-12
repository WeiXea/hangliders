import { useMemo } from 'react'
import * as THREE from 'three'

function makeSailTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 512, 0)
  grad.addColorStop(0, '#9b2226')
  grad.addColorStop(0.2, '#e63946')
  grad.addColorStop(0.35, '#f4a261')
  grad.addColorStop(0.5, '#e9c46a')
  grad.addColorStop(0.65, '#2a9d8f')
  grad.addColorStop(0.8, '#457b9d')
  grad.addColorStop(1, '#1d3557')
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 9; i++) {
    const x = (i / 8) * 512
    g.strokeStyle = 'rgba(255,255,255,0.18)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, 512)
    g.stroke()
  }
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = 'rgba(0,0,0,0.12)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(0, (i / 5) * 512)
    g.lineTo(512, (i / 5) * 512)
    g.stroke()
  }
  // Nose tip white
  g.fillStyle = '#f8f9fa'
  g.beginPath()
  g.moveTo(256, 20)
  g.lineTo(236, 90)
  g.lineTo(276, 90)
  g.fill()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function makeBottomSailTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#ffb703'
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#fb8500'
  for (let i = 0; i < 8; i++) {
    g.fillRect((i / 8) * 256, 0, 16, 256)
  }
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
}

export function GliderModel({ barRef: externalBarRef }: GliderModelProps) {
  const barRef = externalBarRef
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

  return (
    <group>
      <mesh geometry={wingGeo} castShadow receiveShadow>
        <meshStandardMaterial
          map={sailMap}
          roughness={0.48}
          metalness={0.06}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh geometry={wingGeo} castShadow receiveShadow>
        <meshStandardMaterial
          map={bottomMap}
          roughness={0.62}
          metalness={0.04}
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

      {/* Pilot — feet near y ≈ -2.0 so GROUND_CLEARANCE keeps them on terrain */}
      <mesh position={[0, -0.7, -0.05]} castShadow>
        <capsuleGeometry args={[0.22, 0.4, 6, 12]} />
        <meshStandardMaterial color="#1b263b" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.28, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#e9c46a" roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.36, 0.14]}>
        <torusGeometry args={[0.16, 0.04, 8, 16]} />
        <meshStandardMaterial color="#222" roughness={0.9} />
      </mesh>
      <mesh position={[-0.12, -1.45, 0.08]} rotation={[0.15, 0, 0.05]} castShadow>
        <capsuleGeometry args={[0.075, 0.55, 4, 8]} />
        <meshStandardMaterial color="#2b2d42" roughness={0.8} />
      </mesh>
      <mesh position={[0.12, -1.45, -0.05]} rotation={[0.1, 0, -0.05]} castShadow>
        <capsuleGeometry args={[0.075, 0.55, 4, 8]} />
        <meshStandardMaterial color="#2b2d42" roughness={0.8} />
      </mesh>
      <mesh position={[-0.12, -1.95, 0.12]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.22]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[0.12, -1.95, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.22]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
    </group>
  )
}
