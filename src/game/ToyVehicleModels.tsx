import type { VehicleKind } from './VehicleModels'

/** Boxy low-poly cars matching the Sketchfab toy-town look — cheap to draw. */
export function ToyVehicleMesh({
  kind,
  color,
}: {
  kind: VehicleKind
  color?: string
}) {
  if (kind === 'bus') {
    return (
      <group>
        <mesh castShadow position={[0, 1.15, 0]}>
          <boxGeometry args={[2.2, 2.1, 7.2]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0, 1.55, 2.6]}>
          <boxGeometry args={[2.0, 1.0, 1.4]} />
          <meshStandardMaterial color="#74c0fc" roughness={0.35} flatShading />
        </mesh>
        <mesh position={[0, 2.35, 0]}>
          <boxGeometry args={[2.0, 0.12, 6.4]} />
          <meshStandardMaterial color="#4cc9f0" roughness={0.7} flatShading />
        </mesh>
        {[-2.4, -0.6, 1.2, 2.6].map((z) => (
          <mesh key={z} position={[-1.0, 0.35, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 8]} />
            <meshStandardMaterial color="#212529" roughness={0.9} flatShading />
          </mesh>
        ))}
        {[-2.4, -0.6, 1.2, 2.6].map((z) => (
          <mesh key={`r${z}`} position={[1.0, 0.35, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 8]} />
            <meshStandardMaterial color="#212529" roughness={0.9} flatShading />
          </mesh>
        ))}
      </group>
    )
  }

  if (kind === 'fire') {
    return (
      <group>
        <mesh castShadow position={[0, 0.95, -0.2]}>
          <boxGeometry args={[2.2, 1.5, 6.2]} />
          <meshStandardMaterial color="#e63946" roughness={0.8} flatShading />
        </mesh>
        <mesh castShadow position={[0, 1.5, 2.2]}>
          <boxGeometry args={[2.1, 1.1, 1.6]} />
          <meshStandardMaterial color="#212529" roughness={0.75} flatShading />
        </mesh>
        <mesh position={[0, 1.55, 2.4]}>
          <boxGeometry args={[1.8, 0.7, 0.1]} />
          <meshStandardMaterial color="#74c0fc" roughness={0.3} flatShading />
        </mesh>
        <mesh position={[0, 2.2, -1]}>
          <boxGeometry args={[0.2, 1.6, 0.2]} />
          <meshStandardMaterial color="#ced4da" roughness={0.55} flatShading />
        </mesh>
        {[-2.0, 0, 1.8].map((z) => (
          <mesh key={z} position={[-1.0, 0.35, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.36, 0.28, 8]} />
            <meshStandardMaterial color="#212529" roughness={0.9} flatShading />
          </mesh>
        ))}
        {[-2.0, 0, 1.8].map((z) => (
          <mesh key={`r${z}`} position={[1.0, 0.35, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.36, 0.28, 8]} />
            <meshStandardMaterial color="#212529" roughness={0.9} flatShading />
          </mesh>
        ))}
      </group>
    )
  }

  const body =
    kind === 'taxi'
      ? '#ffd60a'
      : kind === 'police'
        ? '#f8f9fa'
        : color && color.startsWith('#')
          ? color
          : '#457b9d'

  return (
    <group>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.85, 0.7, 3.6]} />
        <meshStandardMaterial color={body} roughness={0.8} flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.15, -0.15]}>
        <boxGeometry args={[1.65, 0.65, 2.0]} />
        <meshStandardMaterial color={body} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 1.2, 0.55]}>
        <boxGeometry args={[1.55, 0.5, 0.08]} />
        <meshStandardMaterial color="#74c0fc" roughness={0.3} flatShading />
      </mesh>
      <mesh position={[0, 1.2, -0.85]}>
        <boxGeometry args={[1.55, 0.5, 0.08]} />
        <meshStandardMaterial color="#74c0fc" roughness={0.3} flatShading />
      </mesh>
      {kind === 'police' && (
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[0.7, 0.18, 0.9]} />
          <meshStandardMaterial color="#e63946" emissive="#e63946" emissiveIntensity={0.5} flatShading />
        </mesh>
      )}
      {kind === 'taxi' && (
        <mesh position={[0, 1.55, -0.1]}>
          <boxGeometry args={[0.55, 0.16, 0.7]} />
          <meshStandardMaterial color="#212529" roughness={0.7} flatShading />
        </mesh>
      )}
      {([-0.85, 0.85] as const).map((x) =>
        ([-1.1, 1.1] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.26, 8]} />
            <meshStandardMaterial color="#212529" roughness={0.9} flatShading />
          </mesh>
        )),
      )}
    </group>
  )
}
