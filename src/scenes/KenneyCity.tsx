import { useMemo } from 'react'
import { CITY_BUILDINGS, buildingDepth } from '../game/cityBuildings'
import { CITY_BUILDING_HEIGHT_BIAS } from '../game/cityScale'
import { useCityUrbanMaps } from '../game/cityUrbanMats'

type Facade = ReturnType<typeof useCityUrbanMaps>['facade']

/**
 * Fast city skyline — procedural PBR boxes only (no commercial GLB clones).
 * Collision / shops still use CITY_BUILDINGS data.
 */
function FastBuilding({
  building,
  groundY,
  facade,
}: {
  building: (typeof CITY_BUILDINGS)[number]
  groundY: number
  facade: Facade
}) {
  const depth = buildingDepth(building)
  const h = building.height * CITY_BUILDING_HEIGHT_BIAS
  const y = groundY + h / 2

  return (
    <group position={[building.x, 0, building.z]}>
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[building.width, h, depth]} />
        <meshStandardMaterial
          map={facade.map}
          color={building.color}
          roughness={0.86}
          metalness={0.06}
        />
      </mesh>
      {/* Lit facade band — one plane, not per-window */}
      <mesh position={[0, groundY + h * 0.55, depth * 0.5 + 0.02]}>
        <planeGeometry args={[building.width * 0.85, h * 0.7]} />
        <meshStandardMaterial
          color="#1a2332"
          emissive="#7ec8ff"
          emissiveIntensity={0.18 + (building.id % 5) * 0.04}
          roughness={0.9}
        />
      </mesh>
      {building.shop && (
        <mesh position={[0, groundY + 1.1, depth * 0.5 + 0.04]}>
          <planeGeometry args={[Math.min(building.width * 0.7, 6), 0.9]} />
          <meshStandardMaterial
            color={building.shopColor ?? '#222'}
            emissive={building.shopColor ?? '#ffd60a'}
            emissiveIntensity={0.35}
          />
        </mesh>
      )}
      <mesh position={[0, groundY + h + 0.12, 0]}>
        <boxGeometry args={[building.width * 1.02, 0.24, depth * 1.02]} />
        <meshStandardMaterial color="#2a2e34" roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Outdoor city visuals — fast boxes, no GLB buildings. */
export function KenneyCity({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const urban = useCityUrbanMaps()
  const list = useMemo(() => CITY_BUILDINGS, [])

  return (
    <group>
      {list.map((b) => (
        <FastBuilding
          key={b.id}
          building={b}
          groundY={getHeight(b.x, b.z)}
          facade={urban.facade}
        />
      ))}
    </group>
  )
}

/** No-op — outdoor city no longer preloads commercial GLBs. */
export function preloadKenneyCity() {}
