import { useGameStore } from '../game/gameStore'
import { MAP_POIS, MAP_REGIONS } from '../game/worldTravel'
import styles from './WorldMap.module.css'

/** Schematic world map — biomes + POIs + player wedge. */
export function WorldMap() {
  const open = useGameStore((s) => s.mapOpen)
  const biome = useGameStore((s) => s.biome)
  const flight = useGameStore((s) => s.flight)
  const setMapOpen = useGameStore((s) => s.setMapOpen)

  if (!open) {
    return (
      <button
        type="button"
        className={styles.mapBtn}
        onClick={() => setMapOpen(true)}
        aria-label="Open map"
      >
        Map
      </button>
    )
  }

  const region = MAP_REGIONS.find((r) => r.id === biome)
  // Normalize local position into the active region card
  const size = biome === 'city' ? 3200 : 2800
  const u = Math.min(0.92, Math.max(0.08, (flight.position.x + size / 2) / size))
  const v = Math.min(0.92, Math.max(0.08, (flight.position.z + size / 2) / size))
  const px = region ? region.x + u * region.w : 50
  const py = region ? region.y + v * region.h : 50
  const rot = (-flight.yaw * 180) / Math.PI

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>World</span>
        <button type="button" className={styles.close} onClick={() => setMapOpen(false)}>
          ✕
        </button>
      </div>
      <div className={styles.board}>
        {MAP_REGIONS.map((r) => (
          <div
            key={r.id}
            className={`${styles.region} ${r.id === biome ? styles.regionActive : ''}`}
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.w}%`,
              height: `${r.h}%`,
              background: r.color,
            }}
          >
            <span className={styles.regionLabel}>{r.label}</span>
          </div>
        ))}
        {MAP_POIS.filter((p) => p.biome === biome).map((p) => {
          const r = MAP_REGIONS.find((x) => x.id === p.biome)!
          return (
            <div
              key={p.label}
              className={styles.poi}
              style={{
                left: `${r.x + (p.u / 100) * r.w}%`,
                top: `${r.y + (p.v / 100) * r.h}%`,
              }}
              title={p.label}
            >
              <span className={styles.poiDot} />
              <span className={styles.poiLabel}>{p.label}</span>
            </div>
          )
        })}
        <div
          className={styles.you}
          style={{
            left: `${px}%`,
            top: `${py}%`,
            transform: `translate(-50%, -50%) rotate(${rot}deg)`,
          }}
        />
      </div>
      <p className={styles.hint}>
        City west → Beach · City north → Mountains · fly above ~55 m · M toggles map
      </p>
    </div>
  )
}
