import { Suspense, useMemo, type ReactElement } from 'react'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { CITY_BUILDINGS, buildingDepth, type CityBuilding } from '../game/cityBuildings'

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
}: {
  url: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}) {
  const { scene } = useGLTF(url)
  const root = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    return clone
  }, [scene])
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
    const sY = Math.max(s * 0.85, sy * 0.92)
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
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

    // Intersections
    for (const x of xs) {
      for (const z of zs) {
        if (x < -40 || x > 210 || z < 0 || z > 180) continue
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
        const y = getHeight(mid, z) + 0.02
        result.push(
          <KenneyModel
            key={`h-${mid}-${z}`}
            url={`${ROAD}/road-straight.glb`}
            position={[mid, y, z]}
            rotation={[0, Math.PI / 2, 0]}
            scale={TILE}
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
        // Avoid double-covering if somehow also horizontal — grid is orthogonal so fine
        if (zSet.has(mid) && xSet.has(x)) continue
        const y = getHeight(x, mid) + 0.02
        result.push(
          <KenneyModel
            key={`v-${x}-${mid}`}
            url={`${ROAD}/road-straight.glb`}
            position={[x, y, mid]}
            rotation={[0, 0, 0]}
            scale={TILE}
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
      const y = getHeight(x, z)
      result.push(
        <KenneyModel
          key={`cross-${x}-${z}`}
          url={`${ROAD}/road-crossing.glb`}
          position={[x, y + 0.03, z + 4]}
          scale={TILE * 0.55}
        />,
      )
      result.push(
        <KenneyModel
          key={`lamp-${x}-${z}`}
          url={`${ROAD}/light-curved.glb`}
          position={[x + 5.5, y, z + 5.5]}
          scale={1.4}
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
    const trees = [
      `${RETRO}/tree-large.glb`,
      `${RETRO}/tree-small.glb`,
      `${RETRO}/tree-pine-large.glb`,
      `${RETRO}/tree-park-large.glb`,
    ]
    const spots: [number, number][] = [
      [-48, 20],
      [-45, 28],
      [-50, 40],
      [200, 30],
      [208, 45],
      [215, 60],
      [30, -6],
      [70, -6],
      [120, -6],
      [-30, 130],
      [-38, 140],
      [18, 68],
      [140, 100],
    ]
    spots.forEach(([x, z], i) => {
      items.push(
        <KenneyModel
          key={`tree-${i}`}
          url={trees[i % trees.length]!}
          position={[x, getHeight(x, z), z]}
          scale={1.6 + (i % 3) * 0.15}
          rotation={[0, (i * 0.7) % (Math.PI * 2), 0]}
        />,
      )
    })

    // Retro clutter
    const clutter: [string, number, number, number][] = [
      [`${RETRO}/detail-dumpster-closed.glb`, 24, 38, 1.2],
      [`${RETRO}/detail-dumpster-open.glb`, 80, 70, 1.2],
      [`${RETRO}/detail-bench.glb`, 48, 50, 1.3],
      [`${RETRO}/detail-light-traffic.glb`, 40, 40, 1.5],
      [`${RETRO}/detail-light-traffic.glb`, 62, 62, 1.5],
      [`${RETRO}/detail-barrier-type-a.glb`, 100, 70, 1.4],
      [`${COMM}/detail-awning.glb`, 10, 34, 2.2],
      [`${COMM}/detail-parasol-a.glb`, 14, 34, 1.8],
    ]
    clutter.forEach(([url, x, z, s], i) => {
      items.push(
        <KenneyModel
          key={`prop-${i}`}
          url={url}
          position={[x, getHeight(x, z), z]}
          scale={s}
          rotation={[0, i * 0.4, 0]}
        />,
      )
    })
    return items
  }, [getHeight])

  return <group>{props}</group>
}

/** Kenney visual city layer — roads, buildings, street props (CC0). */
export function KenneyCity({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  return (
    <Suspense fallback={null}>
      <KenneyRoads getHeight={getHeight} />
      {CITY_BUILDINGS.map((b) => (
        <KenneyBuilding key={b.id} building={b} groundY={getHeight(b.x, b.z)} />
      ))}
      <KenneyProps getHeight={getHeight} />
    </Suspense>
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
