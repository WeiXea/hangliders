import { useMemo } from 'react'
import * as THREE from 'three'
import type { BiomeConfig } from '../types/game'

function MoonSurface({ getHeight }: { getHeight: (x: number, z: number) => number }) {
    const { geometry } = useMemo(() => {
    const size = 520
    const segments = 72
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    const cols = new Float32Array(pos.count * 3)
    const c = new THREE.Color()

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = getHeight(x, z)
      pos.setY(i, h)
      const crater = Math.max(0, 1 - Math.hypot(x * 0.06, z * 0.06)) * 0.35
      const tone = 0.42 + crater * 0.08 + Math.sin(x * 0.08) * Math.cos(z * 0.07) * 0.04
      c.setRGB(tone, tone, tone + 0.02)
      cols[i * 3] = c.r
      cols[i * 3 + 1] = c.g
      cols[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
    geo.computeVertexNormals()
    return { geometry: geo }
  }, [getHeight])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.92}
        metalness={0.04}
        envMapIntensity={0.15}
      />
    </mesh>
  )
}

function Starfield() {
  const geo = useMemo(() => {
    const count = 2400
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 2400 + Math.random() * 800
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.cos(phi)
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      sizes[i] = 0.6 + Math.random() * 2.2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])

  return (
    <points geometry={geo} frustumCulled={false} renderOrder={-2}>
      <pointsMaterial
        size={2.4}
        color="#ffffff"
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/** Earth hangs in the black sky — always visible from the landing site. */
function EarthInSky() {
  const earthMat = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const grd = ctx.createRadialGradient(128, 110, 20, 128, 128, 128)
    grd.addColorStop(0, '#7ec8e3')
    grd.addColorStop(0.45, '#2a6f97')
    grd.addColorStop(0.72, '#1d3557')
    grd.addColorStop(1, '#020408')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.ellipse(170, 90, 28, 18, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.ellipse(90, 150, 22, 14, -0.2, 0, Math.PI * 2)
    ctx.fill()
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  }, [])

  return (
    <group position={[-320, 280, -520]} renderOrder={-1}>
      <mesh material={earthMat}>
        <sphereGeometry args={[72, 48, 36]} />
      </mesh>
      {/* Atmosphere rim */}
      <mesh scale={1.06}>
        <sphereGeometry args={[72, 32, 24]} />
        <meshBasicMaterial color="#4cc9f0" transparent opacity={0.12} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      {/* Sunlit crescent highlight */}
      <mesh rotation={[0, 0.4, 0]}>
        <sphereGeometry args={[73, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
        <meshBasicMaterial color="#a8dadc" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Lunar landing site — vacuum black sky, starfield, Earth, crater regolith. */
export function MoonScene({ config }: { config: BiomeConfig }) {
  const [sx, sy, sz] = config.sunPosition

  return (
    <>
      <color attach="background" args={['#000004']} />
      {/* No SharedLighting / no HDRI — vacuum lighting only */}
      <ambientLight intensity={0.03} color="#334455" />
      <directionalLight
        castShadow
        position={[sx, sy, sz]}
        intensity={3.2}
        color="#fff8f0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={320}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-bias={-0.0004}
      />
      <Starfield />
      <EarthInSky />
      <MoonSurface getHeight={config.getHeight} />
      {/* Landing zone marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[10, 11.5, 64]} />
        <meshBasicMaterial color="#ffd60a" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[3.5, 4, 64]} />
        <meshBasicMaterial color="#ffd60a" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Descent plume scar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.04, 4]}>
        <circleGeometry args={[6, 32]} />
        <meshStandardMaterial color="#3a3a3a" roughness={1} metalness={0} />
      </mesh>
    </>
  )
}
