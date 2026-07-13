import { useMemo, useEffect, type ReactElement } from 'react'
import * as THREE from 'three'
import { Text, useTexture } from '@react-three/drei'
import type { BiomeConfig } from '../types/game'
import {
  CITY_BUILDINGS,
  buildingDepth,
  type CityBuilding,
} from '../game/cityBuildings'
import { useGameStore } from '../game/gameStore'
import {
  DetailedTerrain,
  HorizonRing,
  OceanSurface,
} from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'
import { prepMap } from '../game/pbrMaps'
import { CityLife } from './CityLife'

interface CitySceneProps {
  config: BiomeConfig
}

function makeFacadeTexture(color: string, concrete?: THREE.Texture): THREE.CanvasTexture {
  const size = 256
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.fillRect(0, 0, size, size)
  if (concrete?.image) {
    try {
      g.globalAlpha = 0.55
      g.drawImage(concrete.image as CanvasImageSource, 0, 0, size, size)
      g.globalAlpha = 1
      g.fillStyle = color
      g.globalCompositeOperation = 'multiply'
      g.fillRect(0, 0, size, size)
      g.globalCompositeOperation = 'source-over'
    } catch {
      /* canvas draw may fail if image not ready */
    }
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`
    g.fillRect(Math.random() * size, Math.random() * size, 2, 2)
  }
  for (let y = 24; y < size; y += 28) {
    g.fillStyle = 'rgba(0,0,0,0.12)'
    g.fillRect(0, y, size, 2)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

function Building({
  building,
  groundY,
  concreteMap,
  concreteNor,
}: {
  building: CityBuilding
  groundY: number
  concreteMap?: THREE.Texture
  concreteNor?: THREE.Texture
}) {
  const { width, height, color, windows, enterable, roofLandable, shop, shopColor } = building
  const depth = buildingDepth(building)
  const facade = useMemo(() => makeFacadeTexture(color, concreteMap), [color, concreteMap])
  const rows = Math.floor(height / 3)
  const cols = Math.max(1, Math.floor(width / 2))
  const doorW = 1.8
  const doorH = 2.5
  const wallT = 0.28
  const halfW = width / 2
  const halfD = depth / 2
  const facadeProps = {
    map: facade,
    normalMap: concreteNor,
    normalScale: new THREE.Vector2(0.45, 0.45),
    color,
    roughness: 0.78,
    metalness: 0.08,
    side: THREE.DoubleSide,
    envMapIntensity: 0.5,
  } as const

  return (
    <group position={[building.x, groundY, building.z]}>
      {!enterable ? (
        <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            map={facade}
            normalMap={concreteNor}
            normalScale={new THREE.Vector2(0.45, 0.45)}
            color={color}
            roughness={0.78}
            metalness={0.08}
            envMapIntensity={0.5}
          />
        </mesh>
      ) : (
        <>
          <mesh castShadow receiveShadow position={[0, height / 2, -halfD + wallT / 2]}>
            <boxGeometry args={[width, height, wallT]} />
            <meshStandardMaterial {...facadeProps} />
          </mesh>
          <mesh castShadow receiveShadow position={[-halfW + wallT / 2, height / 2, 0]}>
            <boxGeometry args={[wallT, height, depth]} />
            <meshStandardMaterial {...facadeProps} />
          </mesh>
          <mesh castShadow receiveShadow position={[halfW - wallT / 2, height / 2, 0]}>
            <boxGeometry args={[wallT, height, depth]} />
            <meshStandardMaterial {...facadeProps} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[-(doorW / 2 + (halfW - doorW / 2) / 2), height / 2, halfD - wallT / 2]}
          >
            <boxGeometry args={[halfW - doorW / 2, height, wallT]} />
            <meshStandardMaterial {...facadeProps} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[(doorW / 2 + (halfW - doorW / 2) / 2), height / 2, halfD - wallT / 2]}
          >
            <boxGeometry args={[halfW - doorW / 2, height, wallT]} />
            <meshStandardMaterial {...facadeProps} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[0, doorH + (height - doorH) / 2, halfD - wallT / 2]}
          >
            <boxGeometry args={[doorW, height - doorH, wallT]} />
            <meshStandardMaterial {...facadeProps} />
          </mesh>
        </>
      )}

      {roofLandable && (
        <>
          <mesh
            castShadow
            receiveShadow
            position={[0, height + 0.08, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[width * 0.96, depth * 0.96]} />
            <meshStandardMaterial color="#5c6770" roughness={0.9} metalness={0.05} />
          </mesh>
          {[
            [0, height + 0.45, depth * 0.48, width, 0.9, 0.22],
            [0, height + 0.45, -depth * 0.48, width, 0.9, 0.22],
            [width * 0.48, height + 0.45, 0, 0.22, 0.9, depth],
            [-width * 0.48, height + 0.45, 0, 0.22, 0.9, depth],
          ].map(([x, y, z, w, h, d], i) => (
            <mesh key={i} castShadow position={[x, y, z]}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#495057" roughness={0.85} />
            </mesh>
          ))}
          <mesh castShadow position={[width * 0.22, height + 0.55, -depth * 0.15]}>
            <boxGeometry args={[1.4, 0.9, 1.1]} />
            <meshStandardMaterial color="#868e96" metalness={0.45} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[-width * 0.18, height + 0.35, depth * 0.18]}>
            <cylinderGeometry args={[0.35, 0.35, 0.55, 10]} />
            <meshStandardMaterial color="#adb5bd" metalness={0.5} roughness={0.35} />
          </mesh>
        </>
      )}

      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const idx = row * cols + col
          const lit = windows[idx % windows.length]
          const wx = (col - cols / 2 + 0.5) * (width / cols)
          if (enterable && row === 0 && Math.abs(wx) < doorW * 0.55) return null
          return (
            <mesh key={`${row}-${col}`} position={[wx, row * 3 + 1.5, halfD + 0.04]}>
              <planeGeometry args={[Math.min(1.4, width / cols - 0.3), 2.0]} />
              <meshStandardMaterial
                color={lit ? '#ffe066' : '#1a2332'}
                emissive={lit ? '#ffe066' : '#000000'}
                emissiveIntensity={lit ? 0.5 : 0}
                roughness={0.35}
                metalness={0.2}
              />
            </mesh>
          )
        }),
      )}

      {enterable && (
        <group position={[0, 0, halfD + 0.02]}>
          <mesh position={[0, doorH + 0.12, 0]}>
            <boxGeometry args={[doorW + 0.25, 0.2, 0.12]} />
            <meshStandardMaterial color="#212529" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.02, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[doorW * 1.35, 1.2]} />
            <meshStandardMaterial color="#2d6a4f" roughness={0.9} />
          </mesh>
        </group>
      )}

      {shop && (
        <group position={[0, 0, halfD + 0.08]}>
          {/* Awning */}
          <mesh castShadow position={[0, 3.05, 0.55]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[Math.min(width * 0.92, 7.5), 0.08, 1.35]} />
            <meshStandardMaterial
              color={shopColor ?? '#c1272d'}
              roughness={0.65}
              emissive={shopColor ?? '#c1272d'}
              emissiveIntensity={0.15}
            />
          </mesh>
          <mesh position={[0, 3.55, 0.12]}>
            <boxGeometry args={[Math.min(width * 0.88, 6.8), 0.85, 0.18]} />
            <meshStandardMaterial
              color="#111827"
              roughness={0.55}
              metalness={0.2}
            />
          </mesh>
          <Text
            position={[0, 3.55, 0.24]}
            fontSize={0.42}
            color="#f8f9fa"
            anchorX="center"
            anchorY="middle"
            maxWidth={Math.min(width * 0.8, 6)}
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {shop}
          </Text>
          {/* Display windows */}
          {[-1.6, 1.6].map((ox) => (
            <mesh key={ox} position={[ox, 1.55, 0.06]}>
              <planeGeometry args={[1.5, 1.8]} />
              <meshStandardMaterial
                color="#90e0ef"
                transparent
                opacity={0.35}
                roughness={0.1}
                metalness={0.4}
                emissive="#ffe066"
                emissiveIntensity={0.12}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

function BuildingInterior({ config }: { config: BiomeConfig }) {
  const interiorId = useGameStore((s) => s.flight.interiorId)
  const b = CITY_BUILDINGS.find((x) => x.id === interiorId)
  if (!b || !b.enterable) return null
  const gy = config.getHeight(b.x, b.z)
  const depth = buildingDepth(b)
  const roomH = 3.2
  const inset = 0.2

  return (
    <group position={[b.x, gy + 0.12, b.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[b.width - inset * 2, depth - inset * 2]} />
        <meshStandardMaterial color="#d6ccc2" roughness={0.92} />
      </mesh>
      <mesh position={[0, roomH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[b.width - inset * 2, depth - inset * 2]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.95} />
      </mesh>
      {/* Simple furniture */}
      <mesh castShadow position={[-b.width * 0.22, 0.45, -depth * 0.15]}>
        <boxGeometry args={[1.8, 0.9, 0.7]} />
        <meshStandardMaterial color="#6b4423" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[b.width * 0.2, 0.55, depth * 0.1]}>
        <boxGeometry args={[1.2, 1.1, 0.5]} />
        <meshStandardMaterial color="#495057" roughness={0.7} />
      </mesh>
      <pointLight position={[0, roomH - 0.4, 0]} intensity={1.4} color="#ffe8c8" distance={12} />
      <ambientLight intensity={0.35} />
    </group>
  )
}

function CityStreets({ getHeight }: { getHeight: (x: number, z: number) => number }) {
  const parts = useMemo(() => {
    const result: ReactElement[] = []
    const xMin = -55
    const xMax = 235
    const zMin = -15
    const zMax = 205
    const step = 22
    const roadW = 11
    const curbH = 0.18
    const asphaltH = 0.14
    const xs: number[] = []
    const zs: number[] = []
    for (let x = -44; x <= 220; x += step) xs.push(x)
    for (let z = 0; z <= 198; z += step) zs.push(z)

    const roadLenX = xMax - xMin
    const roadLenZ = zMax - zMin
    const midX = (xMin + xMax) / 2
    const midZ = (zMin + zMax) / 2

    for (const z of zs) {
      const base = getHeight(midX, z)
      const y = base + asphaltH * 0.5
      // Thick asphalt slab
      result.push(
        <mesh key={`road-h-${z}`} position={[midX, y, z]} receiveShadow castShadow>
          <boxGeometry args={[roadLenX, asphaltH, roadW]} />
          <meshStandardMaterial color="#1a1d21" roughness={0.92} />
        </mesh>,
      )
      // Raised curbs
      for (const side of [-1, 1] as const) {
        result.push(
          <mesh
            key={`curb-h-${z}-${side}`}
            position={[midX, base + curbH * 0.5 + asphaltH, z + side * (roadW * 0.5 + 0.2)]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[roadLenX, curbH, 0.4]} />
            <meshStandardMaterial color="#6c757d" roughness={0.88} />
          </mesh>,
        )
        result.push(
          <mesh
            key={`walk-h-${z}-${side}`}
            position={[midX, base + asphaltH + curbH + 0.04, z + side * (roadW * 0.5 + 1.5)]}
            receiveShadow
          >
            <boxGeometry args={[roadLenX, 0.08, 2.4]} />
            <meshStandardMaterial color="#868e96" roughness={0.9} />
          </mesh>,
        )
      }
      for (let x = xMin + 4; x < xMax - 4; x += 6) {
        result.push(
          <mesh key={`dash-h-${z}-${x}`} position={[x, base + asphaltH + 0.02, z]}>
            <boxGeometry args={[2.6, 0.03, 0.18]} />
            <meshStandardMaterial color="#f4d35e" roughness={0.65} />
          </mesh>,
        )
      }
    }

    for (const x of xs) {
      const base = getHeight(x, midZ)
      const y = base + asphaltH * 0.5
      result.push(
        <mesh key={`road-v-${x}`} position={[x, y, midZ]} receiveShadow castShadow>
          <boxGeometry args={[roadW, asphaltH, roadLenZ]} />
          <meshStandardMaterial color="#1a1d21" roughness={0.92} />
        </mesh>,
      )
      for (const side of [-1, 1] as const) {
        result.push(
          <mesh
            key={`curb-v-${x}-${side}`}
            position={[x + side * (roadW * 0.5 + 0.2), base + curbH * 0.5 + asphaltH, midZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.4, curbH, roadLenZ]} />
            <meshStandardMaterial color="#6c757d" roughness={0.88} />
          </mesh>,
        )
        result.push(
          <mesh
            key={`walk-v-${x}-${side}`}
            position={[x + side * (roadW * 0.5 + 1.5), base + asphaltH + curbH + 0.04, midZ]}
            receiveShadow
          >
            <boxGeometry args={[2.4, 0.08, roadLenZ]} />
            <meshStandardMaterial color="#868e96" roughness={0.9} />
          </mesh>,
        )
      }
      for (let z = zMin + 4; z < zMax - 4; z += 6) {
        result.push(
          <mesh key={`dash-v-${x}-${z}`} position={[x, base + asphaltH + 0.02, z]}>
            <boxGeometry args={[0.18, 0.03, 2.6]} />
            <meshStandardMaterial color="#f4d35e" roughness={0.65} />
          </mesh>,
        )
      }
    }

    // Intersection crosswalks
    for (const x of xs) {
      for (const z of zs) {
        if (x < xMin + 10 || x > xMax - 10 || z < zMin + 10 || z > zMax - 10) continue
        const base = getHeight(x, z) + asphaltH + 0.03
        for (let k = 0; k < 6; k++) {
          result.push(
            <mesh key={`xw-${x}-${z}-${k}`} position={[x - 2.5 + k * 1.0, base, z + 4.4]}>
              <boxGeometry args={[0.55, 0.025, 2.6]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.8} />
            </mesh>,
          )
        }
      }
    }

    return result
  }, [getHeight])

  return <group>{parts}</group>
}

function SkylineSilhouette() {
  return (
    <group position={[400, 0, 360]}>
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} position={[i * 11, 12 + (i % 5) * 8, (i % 3) * 10]} castShadow>
          <boxGeometry args={[8, 20 + (i % 6) * 10, 8]} />
          <meshStandardMaterial color="#495057" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function ParkBench({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.8, 0.08, 0.5]} />
        <meshStandardMaterial color="#6b4423" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.75, -0.2]}>
        <boxGeometry args={[1.8, 0.45, 0.08]} />
        <meshStandardMaterial color="#6b4423" roughness={0.85} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} castShadow position={[x, 0.25, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.45]} />
          <meshStandardMaterial color="#343a40" />
        </mesh>
      ))}
    </group>
  )
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 4.4, 8]} />
        <meshStandardMaterial color="#212529" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 4.5, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial
          color="#ffe066"
          emissive="#ffe066"
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}

function Billboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.5, 0]}>
        <boxGeometry args={[0.12, 5, 0.12]} />
        <meshStandardMaterial color="#495057" metalness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 5.2, 0]}>
        <boxGeometry args={[3.2, 1.8, 0.15]} />
        <meshStandardMaterial color="#c1272d" roughness={0.7} />
      </mesh>
    </group>
  )
}

export function CityScene({ config }: CitySceneProps) {
  const concrete = useTexture({
    map: '/textures/concrete_diff_1k.jpg',
    nor: '/textures/concrete_nor_1k.jpg',
  })
  useEffect(() => {
    prepMap(concrete.map, 2, THREE.SRGBColorSpace)
    prepMap(concrete.nor, 2)
  }, [concrete])

  return (
    <>
      <SharedSky config={config} />
      <SharedLighting config={config} />
      <DetailedTerrain config={config} biome="city" size={1280} segments={200} />
      <HorizonRing color="#6c757d" y={0} />
      <CityStreets getHeight={config.getHeight} />
      {CITY_BUILDINGS.map((b) => (
        <Building
          key={b.id}
          building={b}
          groundY={config.getHeight(b.x, b.z)}
          concreteMap={concrete.map}
          concreteNor={concrete.nor}
        />
      ))}
      <BuildingInterior config={config} />
      <SkylineSilhouette />
      <CityLife />
      <ParkBench position={[22, config.getHeight(22, 48), 48]} yaw={0.3} />
      <ParkBench position={[48, config.getHeight(48, 88), 88]} yaw={-0.5} />
      <ParkBench position={[90, config.getHeight(90, 130), 130]} yaw={0.8} />
      <ParkBench position={[140, config.getHeight(140, 70), 70]} yaw={-0.2} />
      <ParkBench position={[70, config.getHeight(70, 40), 40]} yaw={1.1} />
      <ParkBench position={[190, config.getHeight(190, 120), 120]} yaw={-0.7} />
      <StreetLamp position={[18, config.getHeight(18, 40), 40]} />
      <StreetLamp position={[40, config.getHeight(40, 62), 62]} />
      <StreetLamp position={[72, config.getHeight(72, 95), 95]} />
      <StreetLamp position={[105, config.getHeight(105, 120), 120]} />
      <StreetLamp position={[160, config.getHeight(160, 150), 150]} />
      <StreetLamp position={[200, config.getHeight(200, 90), 90]} />
      <StreetLamp position={[55, config.getHeight(55, 30), 30]} />
      <StreetLamp position={[125, config.getHeight(125, 70), 70]} />
      <StreetLamp position={[175, config.getHeight(175, 55), 55]} />
      <Billboard position={[35, config.getHeight(35, 75), 75]} />
      <Billboard position={[125, config.getHeight(125, 140), 140]} />
      <Billboard position={[180, config.getHeight(180, 110), 110]} />
      <Billboard position={[60, config.getHeight(60, 160), 160]} />
      <OceanSurface
        y={-0.55}
        scale={[980, 160]}
        deep="#023e8a"
        shallow="#48cae4"
        position={[40, 0, -60]}
        followAxis="none"
      />
    </>
  )
}
