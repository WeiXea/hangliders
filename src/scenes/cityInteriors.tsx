import * as THREE from 'three'
import { Text } from '@react-three/drei'
import type { CityBuilding } from '../game/cityBuildings'
import { buildingDepth } from '../game/cityBuildings'
import type { InteriorTheme } from '../game/cityUnderground'
import { interiorThemeForShop } from '../game/cityUnderground'

const ROOM_H = 3.2

function RoomShell({
  width,
  depth,
  roomH,
  floorColor,
  wallColor,
  ceilingColor,
}: {
  width: number
  depth: number
  roomH: number
  floorColor: string
  wallColor: string
  ceilingColor: string
}) {
  const inset = 0.15
  const w = width - inset * 2
  const d = depth - inset * 2
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={floorColor} roughness={0.88} />
      </mesh>
      <mesh position={[0, roomH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.94} />
      </mesh>
      {/* Back wall */}
      <mesh receiveShadow position={[0, roomH / 2, -d / 2 + 0.08]}>
        <boxGeometry args={[w, roomH, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      {/* Side walls */}
      <mesh receiveShadow position={[-w / 2 + 0.08, roomH / 2, 0]}>
        <boxGeometry args={[0.16, roomH, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      <mesh receiveShadow position={[w / 2 - 0.08, roomH / 2, 0]}>
        <boxGeometry args={[0.16, roomH, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      {/* Front wall with door gap */}
      <mesh receiveShadow position={[-w * 0.28, roomH / 2, d / 2 - 0.08]}>
        <boxGeometry args={[w * 0.44, roomH, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      <mesh receiveShadow position={[w * 0.28, roomH / 2, d / 2 - 0.08]}>
        <boxGeometry args={[w * 0.44, roomH, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      <mesh receiveShadow position={[0, roomH * 0.72, d / 2 - 0.08]}>
        <boxGeometry args={[1.6, roomH * 0.56, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0, 1.25, d / 2 - 0.02]}>
        <boxGeometry args={[1.85, 2.55, 0.12]} />
        <meshStandardMaterial color="#212529" roughness={0.55} />
      </mesh>
    </>
  )
}

function ThemeProps({ theme, width, depth }: { theme: InteriorTheme; width: number; depth: number }) {
  switch (theme) {
    case 'bakery':
      return (
        <>
          <mesh castShadow position={[-width * 0.2, 0.9, -depth * 0.1]}>
            <boxGeometry args={[2.8, 1.8, 0.9]} />
            <meshStandardMaterial color="#6b4423" roughness={0.75} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} castShadow position={[-0.8 + i * 0.7, 1.05, 0.4]}>
              <torusGeometry args={[0.22, 0.08, 8, 16]} />
              <meshStandardMaterial color="#d4a574" roughness={0.65} />
            </mesh>
          ))}
          <pointLight position={[0, 2.6, 0]} intensity={1.6} color="#ffe8c8" distance={10} />
        </>
      )
    case 'police':
      return (
        <>
          <mesh castShadow position={[0, 0.45, -depth * 0.15]}>
            <boxGeometry args={[2.4, 0.9, 1.2]} />
            <meshStandardMaterial color="#343a40" roughness={0.6} />
          </mesh>
          <mesh position={[width * 0.22, 1.4, -depth * 0.2]}>
            <boxGeometry args={[0.8, 1.2, 0.15]} />
            <meshStandardMaterial color="#1d3557" emissive="#1d3557" emissiveIntensity={0.2} />
          </mesh>
          <Text position={[0, 2.5, -depth * 0.25]} fontSize={0.35} color="#74c0fc" anchorX="center">
            SKYLINE PRECINCT
          </Text>
          <pointLight position={[0, 2.8, 0]} intensity={1.2} color="#cfe2ff" distance={11} />
        </>
      )
    case 'cafe':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[-1.2 + i * 1.2, 0, 0.2]}>
              <mesh castShadow position={[0, 0.45, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.9, 10]} />
                <meshStandardMaterial color="#6b4423" roughness={0.8} />
              </mesh>
              <mesh castShadow position={[0, 0.95, 0]}>
                <cylinderGeometry args={[0.42, 0.42, 0.06, 12]} />
                <meshStandardMaterial color="#212529" roughness={0.5} />
              </mesh>
            </group>
          ))}
          <mesh castShadow position={[width * 0.2, 0.55, -depth * 0.15]}>
            <boxGeometry args={[2.2, 1.1, 0.7]} />
            <meshStandardMaterial color="#5c4033" roughness={0.78} />
          </mesh>
          <pointLight position={[0, 2.5, 0.5]} intensity={1.5} color="#ffb347" distance={9} />
        </>
      )
    case 'bank':
      return (
        <>
          <mesh castShadow position={[0, 0.5, -depth * 0.12]}>
            <boxGeometry args={[3.2, 1, 1.1]} />
            <meshStandardMaterial color="#495057" metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[0, 1.35, -depth * 0.12]}>
            <boxGeometry args={[2.6, 1.4, 0.12]} />
            <meshStandardMaterial color="#264653" emissive="#264653" emissiveIntensity={0.15} />
          </mesh>
          <Text position={[0, 1.35, -depth * 0.05]} fontSize={0.28} color="#ffd60a" anchorX="center">
            VAULT ACCESS
          </Text>
          <pointLight position={[0, 2.7, 0]} intensity={1.1} color="#e9ecef" distance={10} />
        </>
      )
    case 'pharmacy':
      return (
        <>
          <mesh castShadow position={[-width * 0.15, 1.2, -depth * 0.2]}>
            <boxGeometry args={[2.5, 2.4, 0.45]} />
            <meshStandardMaterial color="#ffffff" roughness={0.35} />
          </mesh>
          {['#52b788', '#4cc9f0', '#ffd60a'].map((c, i) => (
            <mesh key={c} position={[-0.6 + i * 0.6, 1.4, -depth * 0.16]}>
              <boxGeometry args={[0.35, 0.5, 0.2]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.25} />
            </mesh>
          ))}
          <pointLight position={[0, 2.6, 0]} intensity={1.3} color="#f8f9fa" distance={9} />
        </>
      )
    case 'fire':
      return (
        <>
          <mesh castShadow position={[0, 0.55, 0]}>
            <boxGeometry args={[1.8, 1.1, 2.8]} />
            <meshStandardMaterial color="#d62828" roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.5, -depth * 0.2]}>
            <boxGeometry args={[2.2, 0.9, 0.12]} />
            <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.35} />
          </mesh>
          <pointLight position={[0, 2.5, 0]} intensity={1.4} color="#ff6b6b" distance={10} />
        </>
      )
    case 'diner':
      return (
        <>
          <mesh castShadow position={[0, 0.42, 0.1]}>
            <boxGeometry args={[3.6, 0.84, 1.4]} />
            <meshStandardMaterial color="#c1121f" roughness={0.6} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} castShadow position={[-1.35 + i * 0.9, 0.45, 0.9]}>
              <cylinderGeometry args={[0.28, 0.28, 0.9, 10]} />
              <meshStandardMaterial color="#dee2e6" metalness={0.4} roughness={0.35} />
            </mesh>
          ))}
          <pointLight position={[0, 2.4, 0]} intensity={1.5} color="#ffe066" distance={9} />
        </>
      )
    default:
      return (
        <>
          <mesh castShadow position={[-width * 0.22, 0.45, -depth * 0.15]}>
            <boxGeometry args={[1.8, 0.9, 0.7]} />
            <meshStandardMaterial color="#6b4423" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[width * 0.2, 0.55, depth * 0.1]}>
            <boxGeometry args={[1.2, 1.1, 0.5]} />
            <meshStandardMaterial color="#495057" roughness={0.7} />
          </mesh>
          <pointLight position={[0, ROOM_H - 0.4, 0]} intensity={1.4} color="#ffe8c8" distance={12} />
        </>
      )
  }
}

const THEME_COLORS: Record<InteriorTheme, { floor: string; wall: string; ceiling: string; ambient: string }> = {
  cafe: { floor: '#5c4033', wall: '#3d2c24', ceiling: '#2b211c', ambient: '#ffb347' },
  bakery: { floor: '#d4a574', wall: '#f5ebe0', ceiling: '#fff8f0', ambient: '#ffe8c8' },
  police: { floor: '#495057', wall: '#343a40', ceiling: '#212529', ambient: '#74c0fc' },
  bank: { floor: '#adb5bd', wall: '#dee2e6', ceiling: '#f8f9fa', ambient: '#e9ecef' },
  pharmacy: { floor: '#e9ecef', wall: '#f8f9fa', ceiling: '#ffffff', ambient: '#52b788' },
  grocery: { floor: '#ced4da', wall: '#f1f3f5', ceiling: '#ffffff', ambient: '#457b9d' },
  barber: { floor: '#6b4423', wall: '#212529', ceiling: '#343a40', ambient: '#e76f51' },
  diner: { floor: '#495057', wall: '#212529', ceiling: '#1a1d21', ambient: '#ffe066' },
  fire: { floor: '#495057', wall: '#343a40', ceiling: '#212529', ambient: '#d62828' },
  hotel: { floor: '#c9a227', wall: '#495057', ceiling: '#343a40', ambient: '#ffd60a' },
  gym: { floor: '#212529', wall: '#343a40', ceiling: '#495057', ambient: '#00b4d8' },
  pizza: { floor: '#6b4423', wall: '#c1272d', ceiling: '#212529', ambient: '#e9c46a' },
  bookstore: { floor: '#6b4423', wall: '#495057', ceiling: '#343a40', ambient: '#2a9d8f' },
  sushi: { floor: '#212529', wall: '#343a40', ceiling: '#1a1d21', ambient: '#ff6b6b' },
  tailor: { floor: '#495057', wall: '#6c757d', ceiling: '#adb5bd', ambient: '#9b5de5' },
  flowers: { floor: '#d8f3dc', wall: '#f8f9fa', ceiling: '#ffffff', ambient: '#f72585' },
  generic: { floor: '#d6ccc2', wall: '#e9ecef', ceiling: '#f8f9fa', ambient: '#ffe8c8' },
}

export function ThemedBuildingInterior({
  building,
  groundY,
}: {
  building: CityBuilding
  groundY: number
}) {
  const depth = buildingDepth(building)
  const theme = interiorThemeForShop(building.shop)
  const colors = THEME_COLORS[theme]

  return (
    <group position={[building.x, groundY + 0.12, building.z]}>
      <ambientLight intensity={0.28} color={colors.ambient} />
      <RoomShell
        width={building.width}
        depth={depth}
        roomH={ROOM_H}
        floorColor={colors.floor}
        wallColor={colors.wall}
        ceilingColor={colors.ceiling}
      />
      <ThemeProps theme={theme} width={building.width} depth={depth} />
      {building.shop && (
        <Text position={[0, 2.85, -depth * 0.35]} fontSize={0.38} color="#f8f9fa" anchorX="center" outlineWidth={0.025} outlineColor="#000">
          {building.shop}
        </Text>
      )}
    </group>
  )
}

export function GarageInteriorView({
  label,
  x,
  z,
  groundY,
}: {
  label: string
  x: number
  z: number
  groundY: number
}) {
  return (
    <group position={[x, groundY, z]}>
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 3.5, 0]} intensity={1.2} color="#fff3bf" distance={14} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#495057" roughness={0.88} />
      </mesh>
      <mesh position={[0, 3.2, -3.8]}>
        <boxGeometry args={[10, 3.2, 0.2]} />
        <meshStandardMaterial color="#343a40" roughness={0.8} />
      </mesh>
      <Text position={[0, 2.8, -3.5]} fontSize={0.45} color="#ffd60a" anchorX="center">
        {label}
      </Text>
      {/* Lift platform */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[3.5, 0.3, 5]} />
        <meshStandardMaterial color="#6c757d" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

export function TunnelInteriorView({
  segmentLabel,
  x,
  z,
  floorY,
  secret,
}: {
  segmentLabel?: string
  x: number
  z: number
  floorY: number
  secret?: boolean
}) {
  return (
    <group position={[x, floorY, z]}>
      <ambientLight intensity={0.12} color="#334455" />
      <pointLight position={[0, 2.8, 0]} intensity={0.9} color={secret ? '#ffd60a' : '#74c0fc'} distance={16} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.95} />
      </mesh>
      {/* Tunnel tube */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[3, 3, 40, 16, 1, true]} />
        <meshStandardMaterial color="#495057" roughness={0.85} metalness={0.2} side={THREE.BackSide} />
      </mesh>
      {/* Pipe runs */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 2.6 - i * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 38, 8]} />
          <meshStandardMaterial color="#868e96" metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      {segmentLabel && (
        <Text position={[0, 2.2, 0]} fontSize={0.32} color={secret ? '#ffd60a' : '#adb5bd'} anchorX="center">
          {segmentLabel}
        </Text>
      )}
    </group>
  )
}
