import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Biome, BiomeConfig } from '../types/game'
import { useGroundMaps } from '../game/pbrMaps'
import { useGameStore } from '../game/gameStore'

interface DetailedTerrainProps {
  config: BiomeConfig
  biome: Biome
  size?: number
  segments?: number
}

function sampleColor(biome: Biome, h: number, slope: number, x: number, z: number): THREE.Color {
  const c = new THREE.Color()
  const n =
    Math.sin(x * 0.045) * Math.cos(z * 0.038) * 0.5 +
    Math.sin(x * 0.11 + z * 0.09) * 0.35 +
    Math.sin((x + z) * 0.02) * 0.2

  if (biome === 'beach') {
    // Shore → dunes → scrub → cliff rock — strong spatial breaks
    if (h < 0.8 || (z > 70 && h < 2.2)) c.set('#f7e9c8')
    else if (h < 3.5) c.set('#e8d4a0')
    else if (h < 7 + n * 2) c.set(n > 0.15 ? '#c4a35a' : '#d4b978')
    else if (h < 12 + n * 3) c.set(n > 0 ? '#6a994e' : '#8ab17d')
    else if (slope > 0.35) c.set('#7a6c5d')
    else c.set('#4a7c59')
    if (slope > 0.55) c.lerp(new THREE.Color('#5c5346'), 0.65)
    if (z > 90 && h < 1.8) c.lerp(new THREE.Color('#7ec8e3'), 0.4)
    // Patchy scrub / rock outcrops
    if (n > 0.55 && h > 8) c.lerp(new THREE.Color('#6b705c'), 0.45)
    if (n < -0.5 && h > 4 && h < 10) c.lerp(new THREE.Color('#a3b18a'), 0.35)
  } else if (biome === 'mountains') {
    if (h < 14) c.set(n > 0 ? '#4f772d' : '#606c38')
    else if (h < 28) c.set(n > 0.2 ? '#6b8e4e' : '#588157')
    else if (h < 45) c.set('#8d99ae')
    else if (h < 60) c.set('#adb5bd')
    else c.set('#f8f9fa')
    if (slope > 0.4 && h > 18) c.lerp(new THREE.Color('#495057'), 0.55)
    if (h > 50) c.lerp(new THREE.Color('#ffffff'), Math.min(1, (h - 50) / 30))
    if (n > 0.5 && h < 35) c.lerp(new THREE.Color('#344e41'), 0.3)
  } else {
    // City: parks, pavement, plaza patches
    const road =
      Math.abs(((x % 22) + 22) % 22 - 11) < 1.4 ||
      Math.abs(((z % 22) + 22) % 22 - 10) < 1.4
    if (road) c.set('#2b3035')
    else if (h < 2.5 || n > 0.4) c.set('#52796f')
    else if (n < -0.35) c.set('#6c757d')
    else c.set('#8d99ae')
    if (!road && Math.abs(n) < 0.12) c.lerp(new THREE.Color('#495057'), 0.25)
  }
  c.offsetHSL(n * 0.02, n * 0.04, Math.sin(x * 0.08) * Math.cos(z * 0.07) * 0.04)
  return c
}

export function DetailedTerrain({ config, biome, size = 2800, segments = 220 }: DetailedTerrainProps) {
  const ground = useGroundMaps(biome)

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
      // Mild soften so PBR albedo still reads
      col.offsetHSL(0, -0.02, 0.03)
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
        map={ground.map}
        normalMap={ground.normalMap}
        normalScale={ground.normalScale}
        roughnessMap={ground.roughnessMap}
        roughness={ground.roughness}
        metalness={0.02}
        vertexColors
        envMapIntensity={0.55}
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
    // Gentle waves — keep amplitude low to avoid terrain z-fighting
    float wave = sin(pos.x * 0.045 + uTime * 0.55) * 0.12
               + sin(pos.y * 0.035 + uTime * 0.4) * 0.08
               + sin((pos.x + pos.y) * 0.02 + uTime * 0.3) * 0.06;
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
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSunDir;
  void main() {
    vec3 n = normalize(vec3(
      -cos(vWorldPos.x * 0.05 + uTime * 0.15) * 0.25,
      1.0,
      -cos(vWorldPos.z * 0.04 + uTime * 0.12) * 0.25
    ));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.6);
    float depth = smoothstep(-0.4, 0.5, vElevation);
    vec3 col = mix(uDeep, uShallow, depth * 0.35 + fresnel * 0.35);
    float spec = pow(max(dot(reflect(-viewDir, n), uSunDir), 0.0), 90.0);
    col += vec3(1.0) * spec * 0.35;
    col += vec3(0.7, 0.85, 1.0) * fresnel * 0.2;
    float foam = smoothstep(0.25, 0.55, vElevation) * 0.25;
    col = mix(col, vec3(0.9, 0.95, 1.0), foam);
    gl_FragColor = vec4(col, 1.0);
  }
`

export function OceanSurface({
  y = -0.55,
  scale = [6000, 6000] as [number, number],
  deep = '#012a4a',
  shallow = '#48cae4',
  position = [0, 0, 0] as [number, number, number],
  /** When true, ocean XZ tracks the player so the sea never ends */
  followPlayer = true,
}: {
  y?: number
  scale?: [number, number]
  deep?: string
  shallow?: string
  position?: [number, number, number]
  followPlayer?: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
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
    if (!followPlayer || !meshRef.current) return
    // Snap to 40 m grid so waves don't crawl under the camera
    const { flight } = useGameStore.getState()
    const snap = 40
    meshRef.current.position.x = Math.round(flight.position.x / snap) * snap + position[0]
    meshRef.current.position.z = Math.round(flight.position.z / snap) * snap + position[2]
    meshRef.current.position.y = y
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[position[0], y, position[2]]}
      receiveShadow
      renderOrder={-2}
    >
      <planeGeometry args={[scale[0], scale[1], 64, 48]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={oceanVert}
        fragmentShader={oceanFrag}
        depthWrite
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        side={THREE.FrontSide}
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
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#6c584c" roughness={0.95} />
      </mesh>
      {/* Stratified rock bands */}
      {[0.2, 0.45, 0.7].map((t, i) => (
        <mesh
          key={i}
          position={[size[0] * 0.48, -size[1] * 0.5 + size[1] * t, 0]}
          castShadow
        >
          <boxGeometry args={[0.35, size[1] * 0.06, size[2] * 0.92]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#8a7564' : '#4a3f35'} roughness={0.98} />
        </mesh>
      ))}
    </group>
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 200]}>
      <ringGeometry args={[900, 1750, 72]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  )
}
