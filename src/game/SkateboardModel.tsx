/** Procedural skateboard — deck top at local Y ≈ 0. */

export function SkateboardModel({ color = '#2a4a6a' }: { color?: string }) {
  return (
    <group>
      {/* Deck */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.24, 0.05, 0.82]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Grip tape */}
      <mesh position={[0, 0.028, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.78]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Nose / tail kick tips */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} castShadow position={[0, 0.02, s * 0.38]} rotation={[s * 0.35, 0, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} />
        </mesh>
      ))}
      {/* Trucks + wheels */}
      {([-1, 1] as const).map((s) => (
        <group key={`truck-${s}`} position={[0, -0.06, s * 0.26]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.04, 0.08]} />
            <meshStandardMaterial color="#6a6a6a" roughness={0.4} metalness={0.75} />
          </mesh>
          {([-1, 1] as const).map((w) => (
            <mesh key={w} castShadow position={[w * 0.12, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.04, 12]} />
              <meshStandardMaterial color="#c04020" roughness={0.65} metalness={0.2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
