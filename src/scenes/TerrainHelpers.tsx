import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Biome, BiomeConfig } from '../types/game'

function makeNoiseTexture(base: string, accent: string, size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, size, size)
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = Math.random() * 3
    g.fillStyle = Math.random() > 0.5 ? accent : 'rgba(0,0,0,0.08)'
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(24, 24)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

interface DetailedTerrainProps {
  config: BiomeConfig
  biome: Biome
  size?: number
  segments?: number
}

function sampleColor(biome: Biome, h: number, slope: number, x: number, z: number): THREE.Color {
  const c = new THREE.Color()
  if (biome === 'beach') {
    if (h < 1.2) c.set('#f1e3c6')
    else if (h < 6) c.set('#e9c46a')
    else if (h < 14) c.set('#74a57f')
    else c.set('#52796f')
    if (slope > 0.4) c.lerp(new THREE.Color('#6b705c'), 0.55)
    if (z > 40 && h < 1.5) c.lerp(new THREE.Color('#90e0ef'), 0.25)
  } else if (biome === 'mountains') {
    if (h < 16) c.set('#588157')
    else if (h < 32) c.set('#6b8e4e')
    else if (h < 52) c.set('#8d99ae')
    else c.set('#f1faee')
    if (slope > 0.45 && h > 22) c.lerp(new THREE.Color('#495057'), 0.5)
    if (h > 48) c.lerp(new THREE.Color('#ffffff'), Math.min(1, (h - 48) / 28))
  } else {
    c.set(h < 3.5 ? '#40916c' : '#adb5bd')
    if (Math.abs(((x % 20) + 20) % 20 - 10) < 1.1 || Math.abs(((z % 20) + 20) % 20 - 10) < 1.1) {
      c.set('#343a40')
    }
  }
  c.offsetHSL(0, 0, Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.03)
  return c
}

export function DetailedTerrain({ config, biome, size = 700, segments = 200 }: DetailedTerrainProps) {
  const map = useMemo(() => {
    if (biome === 'beach') return makeNoiseTexture('#e9c46a', '#d4a373')
    if (biome === 'mountains') return makeNoiseTexture('#588157', '#3a5a40')
    return makeNoiseTexture('#52b788', '#40916c')
  }, [biome])

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = config.getHeight(x, z)
      pos.setY(i, h)
      const hx = config.getHeight(x + 1.2, z) - config.getHeight(x - 1.2, z)
      const hz = config.getHeight(x, z + 1.2) - config.getHeight(x, z - 1.2)
      const slope = Math.hypot(hx, hz) / 2.4
      const col = sampleColor(biome, h, slope, x, z)
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [config, biome, size, segments])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          map={map}
          vertexColors
          roughness={0.9}
          metalness={0.03}
        />
    </mesh>
  )
}

const oceanVert = /* glsl */ `
  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vWorldPos;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(pos.x * 0.07 + uTime * 1.1) * 0.55
               + sin(pos.y * 0.05 + uTime * 0.85) * 0.4
               + sin((pos.x + pos.y) * 0.035 + uTime * 0.65) * 0.3;
    pos.z += wave;
    vElevation = wave;
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const oceanFrag = /* glsl */ `
  varying float vElevation;
  varying vec3 vWorldPos;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSunDir;
  void main() {
    vec3 n = normalize(vec3(
      -cos(vWorldPos.x * 0.07) * 0.35,
      1.0,
      -cos(vWorldPos.z * 0.05) * 0.35
    ));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.8);
    float depth = smoothstep(-1.2, 1.4, vElevation);
    vec3 col = mix(uDeep, uShallow, depth * 0.5 + fresnel * 0.4);
    float spec = pow(max(dot(reflect(-viewDir, n), uSunDir), 0.0), 80.0);
    col += vec3(1.0) * spec * 0.45;
    col += vec3(0.7, 0.85, 1.0) * fresnel * 0.25;
    gl_FragColor = vec4(col, 0.95);
  }
`

export function OceanSurface({
  y = -0.35,
  scale = [900, 520] as [number, number],
  deep = '#012a4a',
  shallow = '#48cae4',
}: {
  y?: number
  scale?: [number, number]
  deep?: string
  shallow?: string
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uSunDir: { value: new THREE.Vector3(0.45, 0.85, 0.25).normalize() },
    }),
    [deep, shallow],
  )

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[60, y, 120]} receiveShadow>
      <planeGeometry args={[scale[0], scale[1], 160, 160]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={oceanVert}
        fragmentShader={oceanFrag}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function LaunchRamp({ config }: { config: BiomeConfig }) {
  const { x, z } = config.launchPosition
  const y = config.getHeight(x, z)
  return (
    <group position={[x - 8, y, z - 4]} rotation={[0, config.launchYaw, 0]}>
      <mesh castShadow receiveShadow rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[28, 0.45, 8]} />
        <meshStandardMaterial color="#7f5539" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[26, 0.05, 1.2]} />
        <meshStandardMaterial color="#f4a261" roughness={0.6} emissive="#f4a261" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[-10, 0.9, -3.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.8, 8]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

export function CliffFace({
  position,
  size,
  rotation = 0,
}: {
  position: [number, number, number]
  size: [number, number, number]
  rotation?: number
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#6c584c" roughness={0.95} />
    </mesh>
  )
}

export function ScatterRocks({
  config,
  count = 36,
  area = 160,
}: {
  config: BiomeConfig
  count?: number
  area?: number
}) {
  const rocks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const x = (Math.sin(i * 91.3) * 0.5 + 0.5) * area - area * 0.25
        const z = (Math.cos(i * 47.7) * 0.5 + 0.5) * area
        const y = config.getHeight(x, z)
        const s = 0.5 + (Math.sin(i * 33.1) * 0.5 + 0.5) * 2
        return { x, y, z, s, ry: i * 0.7 }
      }),
    [config, count, area],
  )

  return (
    <>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.y + r.s * 0.25, r.z]} rotation={[0.2, r.ry, 0.12]} castShadow>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color="#8b7e74" roughness={0.92} />
        </mesh>
      ))}
    </>
  )
}

/** Distant horizon ring so the world never looks empty at altitude */
export function HorizonRing({ color = '#7cb518', y = -2 }: { color?: string; y?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 80]}>
      <ringGeometry args={[280, 520, 64]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  )
}
