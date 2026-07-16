import * as THREE from 'three'
import { Text } from '@react-three/drei'
import type { CityBuilding } from '../game/cityBuildings'
import { buildingDepth } from '../game/cityBuildings'
import type { InteriorTheme, TunnelSegment } from '../game/cityUnderground'
import { interiorThemeForShop, nearbyTunnelSegments, undergroundFloorY } from '../game/cityUnderground'

const ROOM_H = 4.4

function RoomShell({
  width,
  depth,
  roomH,
  floorColor,
  wallColor,
  ceilingColor,
  accent,
}: {
  width: number
  depth: number
  roomH: number
  floorColor: string
  wallColor: string
  ceilingColor: string
  accent: string
}) {
  const inset = 0.1
  const w = width - inset * 2
  const d = depth - inset * 2
  const doorW = 2.1
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={floorColor} roughness={0.82} />
      </mesh>
      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -d * 0.05]}>
        <planeGeometry args={[w * 0.55, d * 0.45]} />
        <meshStandardMaterial color={accent} roughness={0.9} />
      </mesh>
      <mesh position={[0, roomH, 0]}>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.92} />
      </mesh>
      {/* Ceiling light grid */}
      {[-0.35, 0.35].map((ox) =>
        [-0.3, 0.15].map((oz) => (
          <group key={`${ox}-${oz}`}>
            <mesh position={[ox * w * 0.35, roomH - 0.18, oz * d]}>
              <boxGeometry args={[1.4, 0.08, 0.55]} />
              <meshStandardMaterial color="#fff8e7" emissive="#ffe8a3" emissiveIntensity={0.9} />
            </mesh>
            <pointLight
              position={[ox * w * 0.35, roomH - 0.7, oz * d]}
              intensity={1.35}
              color="#fff3bf"
              distance={10}
            />
          </group>
        )),
      )}
      {/* Solid walls */}
      <mesh receiveShadow position={[0, roomH / 2, -d / 2 + 0.1]}>
        <boxGeometry args={[w, roomH, 0.22]} />
        <meshStandardMaterial color={wallColor} roughness={0.78} />
      </mesh>
      <mesh receiveShadow position={[-w / 2 + 0.1, roomH / 2, 0]}>
        <boxGeometry args={[0.22, roomH, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.78} />
      </mesh>
      <mesh receiveShadow position={[w / 2 - 0.1, roomH / 2, 0]}>
        <boxGeometry args={[0.22, roomH, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.78} />
      </mesh>
      {/* Front wall with door cutout */}
      <mesh receiveShadow position={[-(doorW / 2 + (w - doorW) / 4), roomH / 2, d / 2 - 0.1]}>
        <boxGeometry args={[(w - doorW) / 2, roomH, 0.22]} />
        <meshStandardMaterial color={wallColor} roughness={0.78} />
      </mesh>
      <mesh receiveShadow position={[(doorW / 2 + (w - doorW) / 4), roomH / 2, d / 2 - 0.1]}>
        <boxGeometry args={[(w - doorW) / 2, roomH, 0.22]} />
        <meshStandardMaterial color={wallColor} roughness={0.78} />
      </mesh>
      <mesh receiveShadow position={[0, 2.7 + (roomH - 2.7) / 2, d / 2 - 0.1]}>
        <boxGeometry args={[doorW, roomH - 2.7, 0.22]} />
        <meshStandardMaterial color={wallColor} roughness={0.78} />
      </mesh>
      {/* Exit door frame + glowing mat */}
      <mesh position={[0, 1.35, d / 2 - 0.02]}>
        <boxGeometry args={[doorW + 0.25, 2.7, 0.14]} />
        <meshStandardMaterial color="#212529" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, d / 2 - 0.55]}>
        <planeGeometry args={[doorW * 1.2, 1.1]} />
        <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.55} />
      </mesh>
      <Text position={[0, 0.12, d / 2 - 0.4]} fontSize={0.28} color="#d8f3dc" anchorX="center">
        EXIT · E
      </Text>
      {/* Window panes (opaque — no street bleed) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.28, 2.1, -d / 2 + 0.14]}>
          <planeGeometry args={[1.6, 1.5]} />
          <meshStandardMaterial color="#87ceeb" emissive="#ffe8a3" emissiveIntensity={0.2} roughness={0.2} />
        </mesh>
      ))}
      {/* Baseboard + crown */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[w - 0.3, 0.24, d - 0.3]} />
        <meshStandardMaterial color="#343a40" roughness={0.7} transparent opacity={0.35} />
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
    case 'grocery':
      return (
        <>
          {[-1.2, 0, 1.2].map((ox) => (
            <mesh key={ox} castShadow position={[ox, 1.1, -depth * 0.18]}>
              <boxGeometry args={[1.5, 2.2, 0.4]} />
              <meshStandardMaterial color="#f1f3f5" roughness={0.55} />
            </mesh>
          ))}
          <mesh castShadow position={[0, 0.45, 0.6]}>
            <boxGeometry args={[2.2, 0.9, 0.7]} />
            <meshStandardMaterial color="#457b9d" roughness={0.6} />
          </mesh>
          <pointLight position={[0, 2.6, 0]} intensity={1.35} color="#f8f9fa" distance={10} />
        </>
      )
    case 'barber':
      return (
        <>
          <mesh castShadow position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.45, 0.5, 1.4, 12]} />
            <meshStandardMaterial color="#dee2e6" metalness={0.35} roughness={0.4} />
          </mesh>
          <mesh position={[width * 0.25, 1.5, -depth * 0.2]}>
            <cylinderGeometry args={[0.12, 0.12, 1.6, 10]} />
            <meshStandardMaterial color="#e76f51" emissive="#e76f51" emissiveIntensity={0.4} />
          </mesh>
          <pointLight position={[0, 2.5, 0]} intensity={1.2} color="#ffe8c8" distance={9} />
        </>
      )
    case 'pizza':
      return (
        <>
          <mesh castShadow position={[0, 0.7, -depth * 0.1]}>
            <boxGeometry args={[2.6, 1.4, 1.2]} />
            <meshStandardMaterial color="#343a40" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.55, -depth * 0.1]}>
            <cylinderGeometry args={[0.7, 0.7, 0.12, 16]} />
            <meshStandardMaterial color="#e9c46a" roughness={0.55} />
          </mesh>
          <pointLight position={[0, 2.6, 0]} intensity={1.4} color="#ffb703" distance={9} />
        </>
      )
    case 'bookstore':
      return (
        <>
          {[-1.4, -0.4, 0.6, 1.6].map((ox) => (
            <mesh key={ox} castShadow position={[ox, 1.2, -depth * 0.22]}>
              <boxGeometry args={[0.85, 2.4, 0.35]} />
              <meshStandardMaterial color="#2a9d8f" roughness={0.7} />
            </mesh>
          ))}
          <pointLight position={[0, 2.5, 0]} intensity={1.15} color="#ffe8c8" distance={9} />
        </>
      )
    case 'gym':
      return (
        <>
          <mesh castShadow position={[-1, 0.35, 0]}>
            <boxGeometry args={[2.2, 0.7, 0.9]} />
            <meshStandardMaterial color="#212529" metalness={0.4} roughness={0.45} />
          </mesh>
          <mesh castShadow position={[1.2, 0.55, 0.3]}>
            <cylinderGeometry args={[0.15, 0.15, 1.1, 8]} />
            <meshStandardMaterial color="#adb5bd" metalness={0.7} roughness={0.3} />
          </mesh>
          <pointLight position={[0, 2.6, 0]} intensity={1.3} color="#00b4d8" distance={10} />
        </>
      )
    case 'flowers':
      return (
        <>
          {[-1, 0, 1].map((ox, i) => (
            <mesh key={ox} castShadow position={[ox, 0.7, 0.2]}>
              <cylinderGeometry args={[0.25, 0.3, 0.9, 10]} />
              <meshStandardMaterial color={['#f72585', '#ff9f1c', '#52b788'][i]} roughness={0.55} />
            </mesh>
          ))}
          <pointLight position={[0, 2.4, 0]} intensity={1.35} color="#fff0f5" distance={9} />
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
  isolated = false,
}: {
  building: CityBuilding
  groundY: number
  isolated?: boolean
}) {
  const depth = Math.max(buildingDepth(building), 8)
  const width = Math.max(building.width, 8.5)
  const theme = interiorThemeForShop(building.shop)
  const colors = THEME_COLORS[theme]

  return (
    <group position={[building.x, groundY + 0.12, building.z]}>
      <ambientLight intensity={isolated ? 0.55 : 0.32} color={colors.ambient} />
      <hemisphereLight args={[colors.ambient, '#1a1410', isolated ? 0.45 : 0.2]} />
      <pointLight position={[0, ROOM_H - 0.6, 0]} intensity={isolated ? 1.8 : 1.1} color="#fff8e7" distance={16} />
      <RoomShell
        width={width}
        depth={depth}
        roomH={ROOM_H}
        floorColor={colors.floor}
        wallColor={colors.wall}
        ceilingColor={colors.ceiling}
        accent={building.shopColor ?? colors.ambient}
      />
      {/* Back counter / partition wall */}
      <mesh castShadow position={[0, 1.15, -depth * 0.22]}>
        <boxGeometry args={[width * 0.72, 1.15, 0.55]} />
        <meshStandardMaterial color="#343a40" roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.35, -depth * 0.28]}>
        <boxGeometry args={[width * 0.5, 0.7, 0.12]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      {building.shop && (
        <Text
          position={[0, 2.35, -depth * 0.2]}
          fontSize={0.42}
          color="#f8f9fa"
          anchorX="center"
          outlineWidth={0.03}
          outlineColor="#000"
        >
          {building.shop}
        </Text>
      )}
      <ThemeProps theme={theme} width={width} depth={depth} />
      {/* Side display shelves */}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * width * 0.38, 0, -depth * 0.05]}>
          {[0.6, 1.4, 2.2].map((hy) => (
            <mesh key={hy} castShadow position={[0, hy, 0]}>
              <boxGeometry args={[0.9, 0.08, depth * 0.45]} />
              <meshStandardMaterial color="#6c757d" roughness={0.6} />
            </mesh>
          ))}
          <mesh castShadow position={[0, 1.4, 0]}>
            <boxGeometry args={[0.12, 2.8, depth * 0.45]} />
            <meshStandardMaterial color="#495057" roughness={0.7} />
          </mesh>
        </group>
      ))}
      <Text position={[0, ROOM_H - 0.45, depth * 0.35]} fontSize={0.26} color="#adb5bd" anchorX="center">
        Press E at the green EXIT mat
      </Text>
    </group>
  )
}

export function GarageInteriorView({
  label,
  x,
  z,
  groundY,
  yaw = 0,
}: {
  label: string
  x: number
  z: number
  groundY: number
  yaw?: number
}) {
  return (
    <group position={[x, groundY, z]} rotation={[0, yaw, 0]}>
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#fff3bf', '#212529', 0.4]} />
      <pointLight position={[0, 3.8, 0]} intensity={2.2} color="#fff3bf" distance={20} />
      <pointLight position={[3, 2.5, 2]} intensity={1.2} color="#ffd60a" distance={14} />
      <pointLight position={[-3, 2.5, -1]} intensity={1.1} color="#fff8e7" distance={14} />
      {[-3, 0, 3].map((ox) => (
        <mesh key={ox} position={[ox, 4.4, 0]}>
          <boxGeometry args={[2.2, 0.1, 8]} />
          <meshStandardMaterial color="#fff8e7" emissive="#ffe8a3" emissiveIntensity={1.0} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 11]} />
        <meshStandardMaterial color="#3d4146" roughness={0.9} />
      </mesh>
      {/* Painted bay lines */}
      {[-3.2, 0, 3.2].map((ox) => (
        <mesh key={ox} rotation={[-Math.PI / 2, 0, 0]} position={[ox, 0.02, 0.4]}>
          <planeGeometry args={[2.4, 5.5]} />
          <meshStandardMaterial color="#495057" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, -5.2]}>
        <boxGeometry args={[14, 4.8, 0.25]} />
        <meshStandardMaterial color="#2b2f33" roughness={0.82} />
      </mesh>
      <mesh position={[-6.8, 2.4, 0]}>
        <boxGeometry args={[0.25, 4.8, 11]} />
        <meshStandardMaterial color="#2b2f33" roughness={0.82} />
      </mesh>
      <mesh position={[6.8, 2.4, 0]}>
        <boxGeometry args={[0.25, 4.8, 11]} />
        <meshStandardMaterial color="#2b2f33" roughness={0.82} />
      </mesh>
      <mesh position={[0, 4.7, 0]}>
        <boxGeometry args={[14, 0.2, 11]} />
        <meshStandardMaterial color="#212529" roughness={0.9} />
      </mesh>
      <Text position={[0, 3.6, -4.9]} fontSize={0.5} color="#ffd60a" anchorX="center" outlineWidth={0.03} outlineColor="#000">
        {label.toUpperCase()}
      </Text>
      <Text position={[0, 2.9, -4.9]} fontSize={0.28} color="#adb5bd" anchorX="center">
        Press E at the bay to exit
      </Text>
      <mesh castShadow position={[0, 0.12, 0.2]}>
        <boxGeometry args={[3.8, 0.24, 6]} />
        <meshStandardMaterial color="#6c757d" metalness={0.55} roughness={0.38} />
      </mesh>
      {/* Tool chest */}
      <mesh castShadow position={[-5.2, 0.55, -3.5]}>
        <boxGeometry args={[1.4, 1.1, 0.7]} />
        <meshStandardMaterial color="#e63946" roughness={0.55} metalness={0.25} />
      </mesh>
    </group>
  )
}

function CorridorMesh({
  seg,
  floorY,
}: {
  seg: TunnelSegment
  floorY: number
}) {
  const w = seg.halfW * 2
  const d = seg.halfD * 2
  const h = 3.4
  const wallT = 0.22
  const alongZ = seg.halfD >= seg.halfW
  const accent = seg.surfaceExit ? '#4cc9f0' : seg.secret ? '#9b5de5' : '#6c757d'
  return (
    <group position={[seg.x, floorY, seg.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#1f2226" roughness={0.96} />
      </mesh>
      {/* Center walk stripe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={alongZ ? [0.35, d * 0.92] : [w * 0.92, 0.35]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} roughness={0.7} />
      </mesh>
      {/* Side walls */}
      {alongZ ? (
        <>
          <mesh position={[-w / 2 + wallT / 2, h / 2, 0]}>
            <boxGeometry args={[wallT, h, d]} />
            <meshStandardMaterial color="#343a40" roughness={0.88} />
          </mesh>
          <mesh position={[w / 2 - wallT / 2, h / 2, 0]}>
            <boxGeometry args={[wallT, h, d]} />
            <meshStandardMaterial color="#343a40" roughness={0.88} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, h / 2, -d / 2 + wallT / 2]}>
            <boxGeometry args={[w, h, wallT]} />
            <meshStandardMaterial color="#343a40" roughness={0.88} />
          </mesh>
          <mesh position={[0, h / 2, d / 2 - wallT / 2]}>
            <boxGeometry args={[w, h, wallT]} />
            <meshStandardMaterial color="#343a40" roughness={0.88} />
          </mesh>
        </>
      )}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w, 0.16, d]} />
        <meshStandardMaterial color="#15181c" roughness={0.92} />
      </mesh>
      {/* Ceiling light strip — emissive only; player lantern covers the rest */}
      <mesh position={[0, h - 0.12, 0]}>
        <boxGeometry args={alongZ ? [0.45, 0.1, Math.min(d * 0.8, 16)] : [Math.min(w * 0.8, 16), 0.1, 0.45]} />
        <meshStandardMaterial color="#fff8e7" emissive="#ffe8a3" emissiveIntensity={1.35} />
      </mesh>
      {seg.label && (seg.surfaceExit || seg.buildingLink != null || seg.secret) && (
        <Text
          position={[0, 2.4, 0]}
          fontSize={0.34}
          color={accent}
          anchorX="center"
          outlineWidth={0.03}
          outlineColor="#000"
          maxWidth={Math.min(w, d) * 1.4}
        >
          {seg.label}
        </Text>
      )}
      {seg.surfaceExit && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.6, 2.05, 28]} />
          <meshStandardMaterial color="#52b788" emissive="#52b788" emissiveIntensity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
      {seg.buildingLink != null && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.1, 1.4, 24]} />
          <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

export function TunnelNetworkView({
  playerX,
  playerZ,
  getHeight,
  currentLabel,
}: {
  playerX: number
  playerZ: number
  getHeight: (x: number, z: number) => number
  currentLabel?: string
}) {
  const segs = nearbyTunnelSegments(playerX, playerZ, 60)
  const playerFloor = undergroundFloorY(getHeight, playerX, playerZ)
  return (
    <group>
      <ambientLight intensity={0.42} color="#6a849c" />
      <hemisphereLight args={['#9ec5e8', '#0f1318', 0.55]} />
      <pointLight position={[playerX, playerFloor + 3.2, playerZ]} intensity={1.2} color="#fff3bf" distance={22} />
      {segs.map((seg) => (
        <CorridorMesh
          key={seg.id}
          seg={seg}
          floorY={undergroundFloorY(getHeight, seg.x, seg.z)}
        />
      ))}
      {currentLabel && (
        <Text
          position={[playerX, playerFloor + 2.85, playerZ]}
          fontSize={0.28}
          color="#e9ecef"
          anchorX="center"
        >
          {currentLabel}
        </Text>
      )}
    </group>
  )
}
