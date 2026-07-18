import { Suspense, useMemo, type ReactElement } from 'react'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { CITY_BUILDINGS, buildingDepth, type CityBuilding } from '../game/cityBuildings'
import { inRoadTunnel } from '../game/cityRoadTunnels'
import { CITY_BUILDING_HEIGHT_BIAS } from '../game/cityScale'
import { useCityUrbanMaps } from '../game/cityUrbanMats'

const ROAD = '/models/kenney/roads'
const COMM = '/models/kenney/commercial'
const RETRO = '/models/kenney/retro'

/** Kenney City Kit tiles are ~1×1 units; our street cells are 11 m wide. */
const TILE = 11

function KenneyModel({
  url,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  shadows = true,
}: {
  url: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  /** Road tiles skip shadows — huge city FPS win */
  shadows?: boolean
}) {
  const { scene } = useGLTF(url)
  const root = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = shadows
        mesh.receiveShadow = shadows
      }
    })
    return clone
  }, [scene, shadows])
  return <primitive object={root} position={position} rotation={rotation} scale={scale} />
}

const BUILDING_MODELS = [
  `${COMM}/building-a.glb`,
  `${COMM}/building-b.glb`,
  `${COMM}/building-c.glb`,
  `${COMM}/building-d.glb`,
  `${COMM}/building-e.glb`,
  `${COMM}/building-f.glb`,
  `${COMM}/building-g.glb`,
  `${COMM}/building-h.glb`,
  `${COMM}/building-i.glb`,
  `${COMM}/building-j.glb`,
  `${COMM}/building-k.glb`,
  `${COMM}/building-l.glb`,
  `${COMM}/building-m.glb`,
  `${COMM}/building-n.glb`,
]

const SKY_MODELS = [
  `${COMM}/building-skyscraper-a.glb`,
  `${COMM}/building-skyscraper-b.glb`,
  `${COMM}/building-skyscraper-c.glb`,
  `${COMM}/building-skyscraper-d.glb`,
  `${COMM}/building-skyscraper-e.glb`,
]

/** Approximate native Kenney building footprint at scale 1 (from measured bounds). */
function pickBuildingUrl(b: CityBuilding): string {
  if (b.height >= 22) return SKY_MODELS[b.id % SKY_MODELS.length]!
  return BUILDING_MODELS[b.id % BUILDING_MODELS.length]!
}

function KenneyBuilding({
  building,
  groundY,
}: {
  building: CityBuilding
  groundY: number
}) {
  const url = pickBuildingUrl(building)
  const { scene } = useGLTF(url)
  const depth = buildingDepth(building)

  const { root, scale } = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const sx = building.width / Math.max(0.2, size.x)
    const sz = depth / Math.max(0.2, size.z)
    const sy = building.height / Math.max(0.2, size.y)
    // Uniform-ish scale so proportions stay Kenney; prefer width/depth fit, stretch height lightly
    const s = Math.min(sx, sz) * 0.98
    const sY = Math.max(s * 0.85, sy * 0.92) * CITY_BUILDING_HEIGHT_BIAS
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        // Buildings: no shadows — city shadow maps were thrashing the GPU
        mesh.castShadow = false
        mesh.receiveShadow = false
      }
    })
    // Shift so base sits on ground (Kenney pivots at y=0 already)
    return { root: clone, scale: [s, sY, s] as [number, number, number] }
  }, [scene, building.width, building.height, depth])

  return (
    <group position={[building.x, groundY, building.z]}>
      <primitive object={root} scale={scale} />
      {building.shop && (
        <group position={[0, 3.2, depth * 0.5 + 0.2]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[Math.min(building.width * 0.85, 6.5), 0.75, 0.18]} />
            <meshStandardMaterial color={building.shopColor ?? '#b91c1c'} roughness={0.55} metalness={0.15} />
          </mesh>
          <Text
            position={[0, 0, 0.12]}
            fontSize={0.34}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
            maxWidth={Math.min(building.width * 0.75, 5.5)}
          >
            {building.shop}
          </Text>
        </group>
      )}
      {building.enterable && (
        <mesh position={[0, 0.04, depth * 0.5 + 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.45, 24]} />
          <meshStandardMaterial
            color="#2d6a4f"
            emissive="#2d6a4f"
            emissiveIntensity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

function KenneyRoads({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const tiles = useMemo(() => {
    const result: ReactElement[] = []
    const xs: number[] = []
    const zs: number[] = []
    for (let x = -44; x <= 220; x += 22) xs.push(x)
    for (let z = 0; z <= 198; z += 22) zs.push(z)

    const xSet = new Set(xs)
    const zSet = new Set(zs)

    // Intersections (skip underpass footprints — dipped tunnels own that asphalt)
    for (const x of xs) {
      for (const z of zs) {
        if (x < -40 || x > 210 || z < 0 || z > 180) continue
        if (inRoadTunnel(x, z)) continue
        const y = getHeight(x, z) + 0.02
        const url =
          (x + z) % 44 === 0
            ? `${ROAD}/road-crossroad-line.glb`
            : `${ROAD}/road-intersection.glb`
        result.push(
          <KenneyModel
            key={`ix-${x}-${z}`}
            url={url}
            position={[x, y, z]}
            scale={TILE}
            shadows={false}
          />,
        )
      }
    }

    // Horizontal straights between intersections (along +X)
    for (const z of zs) {
      for (let i = 0; i < xs.length - 1; i++) {
        const x0 = xs[i]!
        const x1 = xs[i + 1]!
        const mid = (x0 + x1) / 2
        if (inRoadTunnel(mid, z)) continue
        const y = getHeight(mid, z) + 0.02
        result.push(
          <KenneyModel
            key={`h-${mid}-${z}`}
            url={`${ROAD}/road-straight.glb`}
            position={[mid, y, z]}
            rotation={[0, Math.PI / 2, 0]}
            scale={TILE}
            shadows={false}
          />,
        )
      }
    }

    // Vertical straights between intersections (along +Z)
    for (const x of xs) {
      for (let i = 0; i < zs.length - 1; i++) {
        const z0 = zs[i]!
        const z1 = zs[i + 1]!
        const mid = (z0 + z1) / 2
        if (zSet.has(mid) && xSet.has(x)) continue
        if (inRoadTunnel(x, mid)) continue
        const y = getHeight(x, mid) + 0.02
        result.push(
          <KenneyModel
            key={`v-${x}-${mid}`}
            url={`${ROAD}/road-straight.glb`}
            position={[x, y, mid]}
            rotation={[0, 0, 0]}
            scale={TILE}
            shadows={false}
          />,
        )
      }
    }

    // A few crossings / light posts for polish
    const hubs = [
      [44, 44],
      [66, 66],
      [110, 66],
      [44, 110],
      [110, 110],
    ] as const
    for (const [x, z] of hubs) {
      if (inRoadTunnel(x, z)) continue
      const y = getHeight(x, z)
      result.push(
        <KenneyModel
          key={`cross-${x}-${z}`}
          url={`${ROAD}/road-crossing.glb`}
          position={[x, y + 0.03, z + 4]}
          scale={TILE * 0.55}
          shadows={false}
        />,
      )
      result.push(
        <KenneyModel
          key={`lamp-${x}-${z}`}
          url={`${ROAD}/light-curved.glb`}
          position={[x + 5.5, y, z + 5.5]}
          scale={1.4}
          shadows={false}
        />,
      )
    }

    return result
  }, [getHeight])

  return <group>{tiles}</group>
}

function KenneyProps({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const props = useMemo(() => {
    const items: ReactElement[] = []
    // Keep a handful of landmarks only (was 20+ GLBs)
    const sparse: [string, number, number, number][] = [
      [`${RETRO}/tree-large.glb`, -48, 28, 1.7],
      [`${RETRO}/tree-park-large.glb`, 208, 45, 1.8],
      [`${RETRO}/detail-light-traffic.glb`, 44, 44, 1.5],
      [`${RETRO}/detail-light-traffic.glb`, 110, 66, 1.5],
      [`${RETRO}/detail-bench.glb`, 48, 50, 1.3],
      [`${COMM}/detail-awning.glb`, 10, 34, 2.2],
    ]
    sparse.forEach(([url, x, z, s], i) => {
      items.push(
        <KenneyModel
          key={`prop-${i}`}
          url={url}
          position={[x, getHeight(x, z), z]}
          scale={s}
          rotation={[0, i * 0.5, 0]}
          shadows={false}
        />,
      )
    })
    return items
  }, [getHeight])

  return <group>{props}</group>
}

function BoxFallback({
  building,
  groundY,
}: {
  building: CityBuilding
  groundY: number
}) {
  const depth = buildingDepth(building)
  const urban = useCityUrbanMaps()
  return (
    <mesh
      castShadow
      receiveShadow
      position={[building.x, groundY + building.height / 2, building.z]}
    >
      <boxGeometry args={[building.width, building.height, depth]} />
      <meshStandardMaterial
        map={urban.facade.map}
        normalMap={urban.facade.normalMap}
        roughnessMap={urban.facade.roughnessMap}
        color={building.color}
        roughness={0.82}
        metalness={0.08}
      />
    </mesh>
  )
}

/**
 * Kenney visual city layer — buildings only.
 * Road GLB tiles (~300 clones) are skipped; CityStreets PBR asphalt carries the grid.
 */
export function KenneyCity({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  return (
    <group>
      {CITY_BUILDINGS.map((b) => (
        <Suspense
          key={b.id}
          fallback={<BoxFallback building={b} groundY={getHeight(b.x, b.z)} />}
        >
          <KenneyBuilding building={b} groundY={getHeight(b.x, b.z)} />
        </Suspense>
      ))}
      {/* Sparse props only — full KenneyRoads / dense props were the FPS killer */}
      <Suspense fallback={null}>
        <KenneyProps getHeight={getHeight} />
      </Suspense>
    </group>
  )
}

export function preloadKenneyCity() {
  for (const u of BUILDING_MODELS) useGLTF.preload(u)
  for (const u of SKY_MODELS) useGLTF.preload(u)
  useGLTF.preload(`${ROAD}/road-straight.glb`)
  useGLTF.preload(`${ROAD}/road-intersection.glb`)
  useGLTF.preload(`${ROAD}/road-crossroad-line.glb`)
  useGLTF.preload(`${ROAD}/road-crossing.glb`)
  useGLTF.preload(`${ROAD}/light-curved.glb`)
}
