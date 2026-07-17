import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { VehicleKind } from './VehicleModels'
import { CITY_VEHICLE_SCALE } from './cityScale'

const CAR_BASE = '/models/kenney/cars'

const KIND_MODEL: Record<VehicleKind, string> = {
  car: `${CAR_BASE}/sedan.glb`,
  taxi: `${CAR_BASE}/taxi.glb`,
  police: `${CAR_BASE}/police.glb`,
  fire: `${CAR_BASE}/firetruck.glb`,
  bus: `${CAR_BASE}/garbage-truck.glb`,
}

const CAR_VARIANTS = [
  `${CAR_BASE}/sedan.glb`,
  `${CAR_BASE}/hatchback-sports.glb`,
  `${CAR_BASE}/suv.glb`,
  `${CAR_BASE}/van.glb`,
  `${CAR_BASE}/sedan-sports.glb`,
]

function modelFor(kind: VehicleKind, color?: string): string {
  if (kind !== 'car') return KIND_MODEL[kind]
  // Pick a body style from the paint color so traffic isn't all sedans
  let h = 0
  const key = color ?? '#457b9d'
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return CAR_VARIANTS[h % CAR_VARIANTS.length]!
}

/** Kenney Car Kit body — wheels included in GLB. */
export function KenneyVehicleMesh({
  kind,
  color,
}: {
  kind: VehicleKind
  color?: string
}) {
  const url = modelFor(kind, color)
  const { scene } = useGLTF(url)
  const root = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m) continue
          m.side = THREE.FrontSide
          // Mild color tint for generic cars (taxi/police keep kit paint)
          if (kind === 'car' && color && (m as THREE.MeshStandardMaterial).color) {
            const std = m as THREE.MeshStandardMaterial
            if (mesh.name.toLowerCase().includes('body') || mesh.name === '') {
              std.color = new THREE.Color(color)
            }
          }
        }
      }
    })
    return clone
  }, [scene, kind, color])

  // Kenney Car Kit faces +Z — same forward as our traffic groups.
  // Scaled up so cars fill 11 m lanes next to a real-size pilot.
  return <primitive object={root} scale={CITY_VEHICLE_SCALE} />
}

export function preloadKenneyVehicles() {
  const urls = new Set<string>([...Object.values(KIND_MODEL), ...CAR_VARIANTS])
  for (const u of urls) useGLTF.preload(u)
}
