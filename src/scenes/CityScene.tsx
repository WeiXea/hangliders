import { useMemo, useEffect, type ReactElement } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
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
  LaunchRamp,
  OceanSurface,
} from './TerrainHelpers'
import { SharedSky, SharedLighting } from './SharedSky'
import { prepMap } from '../game/pbrMaps'

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
  const { width, height, color, windows, enterable, roofLandable } = building
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

function StreetGrid() {
  const lines = useMemo(() => {
    const result: ReactElement[] = []
    for (let i = -240; i <= 420; i += 22) {
      result.push(
        <mesh key={`h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[80, 0.08, i]}>
          <planeGeometry args={[840, 2.2]} />
          <meshStandardMaterial color="#343a40" roughness={0.88} />
        </mesh>,
      )
      result.push(
        <mesh key={`v${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[i, 0.08, 100]}>
          <planeGeometry args={[840, 2.2]} />
          <meshStandardMaterial color="#343a40" roughness={0.88} />
        </mesh>,
      )
    }
    return result
  }, [])
  return <>{lines}</>
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
      <StreetGrid />
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
      <LaunchRamp config={config} />
      <ParkBench position={[22, config.getHeight(22, 48), 48]} yaw={0.3} />
      <ParkBench position={[48, config.getHeight(48, 88), 88]} yaw={-0.5} />
      <ParkBench position={[90, config.getHeight(90, 130), 130]} yaw={0.8} />
      <ParkBench position={[140, config.getHeight(140, 70), 70]} yaw={-0.2} />
      <StreetLamp position={[18, config.getHeight(18, 40), 40]} />
      <StreetLamp position={[40, config.getHeight(40, 62), 62]} />
      <StreetLamp position={[72, config.getHeight(72, 95), 95]} />
      <StreetLamp position={[105, config.getHeight(105, 120), 120]} />
      <StreetLamp position={[160, config.getHeight(160, 150), 150]} />
      <StreetLamp position={[200, config.getHeight(200, 90), 90]} />
      <Billboard position={[35, config.getHeight(35, 75), 75]} />
      <Billboard position={[125, config.getHeight(125, 140), 140]} />
      <Billboard position={[180, config.getHeight(180, 110), 110]} />
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
