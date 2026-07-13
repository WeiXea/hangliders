import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { getThermals, thermalCenter } from '../game/atmosphere'

const DUST_N = 48
const VORTEX_N = 36
const SHIMMER_N = 80

/** Takeoff/landing dust, tip vortices, thermal shimmer — cheap Points FX. */
export function FlightParticles() {
  return (
    <group>
      <DustBurst />
      <WalkDust />
      <TipVortices />
      <ThermalShimmer />
    </group>
  )
}

function DustBurst() {
  const points = useRef<THREE.Points>(null)
  const life = useRef(new Float32Array(DUST_N))
  const vel = useRef(new Float32Array(DUST_N * 3))
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3))
    return g
  }, [])

  useFrame((_, dt) => {
    const pts = points.current
    if (!pts) return
    const { flight } = useGameStore.getState()
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const L = life.current
    const V = vel.current

    const kick =
      (flight.phase === 'running' && flight.airspeed > 8) ||
      (flight.phase === 'flying' && flight.altitude < 4 && flight.airspeed > 9)

    if (kick) {
      for (let i = 0; i < 3; i++) {
        const slot = Math.floor(Math.random() * DUST_N)
        if (L[slot] > 0.15) continue
        L[slot] = 0.6 + Math.random() * 0.5
        const side = (Math.random() - 0.5) * 2.4
        arr[slot * 3] = flight.position.x + Math.cos(flight.yaw) * side
        arr[slot * 3 + 1] = flight.position.y - 1.6
        arr[slot * 3 + 2] = flight.position.z - Math.sin(flight.yaw) * side
        V[slot * 3] = (Math.random() - 0.5) * 2
        V[slot * 3 + 1] = 1.2 + Math.random() * 2
        V[slot * 3 + 2] = (Math.random() - 0.5) * 2
      }
    }

    for (let i = 0; i < DUST_N; i++) {
      if (L[i] <= 0) {
        arr[i * 3 + 1] = -999
        continue
      }
      L[i] -= dt
      arr[i * 3] += V[i * 3] * dt
      arr[i * 3 + 1] += V[i * 3 + 1] * dt
      arr[i * 3 + 2] += V[i * 3 + 2] * dt
      V[i * 3 + 1] -= 4 * dt
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color="#cbb891"
        size={0.45}
        transparent
        opacity={0.45}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

const WALK_N = 36

function WalkDust() {
  const points = useRef<THREE.Points>(null)
  const mat = useRef<THREE.PointsMaterial>(null)
  const life = useRef(new Float32Array(WALK_N))
  const vel = useRef(new Float32Array(WALK_N * 3))
  const acc = useRef(0)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WALK_N * 3), 3))
    return g
  }, [])

  useFrame((_, dt) => {
    const pts = points.current
    if (!pts) return
    const { flight, biome } = useGameStore.getState()
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const L = life.current
    const V = vel.current

    const walking = flight.phase === 'walking' && flight.airspeed > 0.4
    const color =
      biome === 'beach' ? '#cbb891' : biome === 'mountains' ? '#8d9b6c' : '#6c757d'
    if (mat.current) mat.current.color.set(color)

    if (walking) {
      acc.current += dt * (flight.airspeed > 3.5 ? 18 : 10)
      while (acc.current > 1) {
        acc.current -= 1
        const slot = Math.floor(Math.random() * WALK_N)
        L[slot] = 0.35 + Math.random() * 0.25
        const side = (Math.random() - 0.5) * 0.35
        const fx = Math.sin(flight.yaw)
        const fz = Math.cos(flight.yaw)
        arr[slot * 3] = flight.position.x - fx * 0.2 + fz * side
        arr[slot * 3 + 1] = flight.position.y + 0.05
        arr[slot * 3 + 2] = flight.position.z - fz * 0.2 - fx * side
        V[slot * 3] = (Math.random() - 0.5) * 0.8
        V[slot * 3 + 1] = 0.6 + Math.random() * 0.8
        V[slot * 3 + 2] = (Math.random() - 0.5) * 0.8
      }
    }

    for (let i = 0; i < WALK_N; i++) {
      if (L[i] <= 0) {
        arr[i * 3 + 1] = -999
        continue
      }
      L[i] -= dt
      arr[i * 3] += V[i * 3] * dt
      arr[i * 3 + 1] += V[i * 3 + 1] * dt
      arr[i * 3 + 2] += V[i * 3 + 2] * dt
      V[i * 3 + 1] -= 5 * dt
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        ref={mat}
        color="#cbb891"
        size={0.22}
        transparent
        opacity={0.4}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

function TipVortices() {
  const left = useRef<THREE.Points>(null)
  const right = useRef<THREE.Points>(null)
  const geoL = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(VORTEX_N * 3), 3))
    return g
  }, [])
  const geoR = useMemo(() => geoL.clone(), [geoL])
  const phase = useRef(0)

  useFrame((_, dt) => {
    phase.current += dt
    const { flight } = useGameStore.getState()
    const active =
      flight.phase === 'flying' && flight.airspeed > 9 && Math.abs(flight.roll) > 0.08
    for (const [ref, sign] of [
      [left, 1],
      [right, -1],
    ] as const) {
      const pts = ref.current
      if (!pts) continue
      const pos = pts.geometry.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      if (!active) {
        for (let i = 0; i < VORTEX_N; i++) arr[i * 3 + 1] = -999
        pos.needsUpdate = true
        continue
      }
      const tipX = Math.cos(flight.yaw) * sign * 4.6
      const tipZ = -Math.sin(flight.yaw) * sign * 4.6
      for (let i = 0; i < VORTEX_N; i++) {
        const u = i / VORTEX_N
        const trail = u * 7
        const spiral = phase.current * 6 + u * 10
        const r = 0.15 + u * 0.35
        arr[i * 3] =
          flight.position.x +
          tipX -
          Math.sin(flight.yaw) * trail +
          Math.cos(spiral) * r * Math.cos(flight.yaw)
        arr[i * 3 + 1] = flight.position.y + 0.4 + Math.sin(spiral) * r - u * 0.8
        arr[i * 3 + 2] =
          flight.position.z +
          tipZ -
          Math.cos(flight.yaw) * trail +
          Math.sin(spiral) * r * Math.sin(flight.yaw)
      }
      pos.needsUpdate = true
      const mat = pts.material as THREE.PointsMaterial
      mat.opacity = 0.12 + Math.min(0.25, Math.abs(flight.roll) * 0.35)
    }
  })

  return (
    <>
      <points ref={left} geometry={geoL} frustumCulled={false}>
        <pointsMaterial
          color="#e8f1f8"
          size={0.22}
          transparent
          opacity={0.2}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points ref={right} geometry={geoR} frustumCulled={false}>
        <pointsMaterial
          color="#e8f1f8"
          size={0.22}
          transparent
          opacity={0.2}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  )
}

function ThermalShimmer() {
  const points = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SHIMMER_N * 3), 3))
    return g
  }, [])

  useFrame(({ clock }) => {
    const pts = points.current
    if (!pts) return
    const store = useGameStore.getState()
    const thermals = getThermals(store.biome)
    if (thermals.length === 0) return
    const config = BIOME_CONFIGS[store.biome]
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const t = clock.elapsedTime

    for (let i = 0; i < SHIMMER_N; i++) {
      const th = thermals[i % thermals.length]
      const { cx, cz } = thermalCenter(th, store.simTime)
      const gy = config.getHeight(cx, cz)
      const ang = (i / SHIMMER_N) * Math.PI * 2 + t * 0.4
      const rad = (0.15 + (i % 7) * 0.08) * th.radius
      const h =
        gy +
        4 +
        ((i * 17) % 40) +
        Math.sin(t * 1.3 + i) * 2 +
        ((t * 8 + i * 3) % Math.max(12, th.y1 - th.y0))
      arr[i * 3] = cx + Math.cos(ang) * rad * 0.55
      arr[i * 3 + 1] = Math.min(th.y1, h)
      arr[i * 3 + 2] = cz + Math.sin(ang) * rad * 0.55
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color="#b7f0c8"
        size={0.55}
        transparent
        opacity={0.28}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
