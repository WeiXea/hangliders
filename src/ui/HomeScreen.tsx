import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import type { Biome, GameMode } from '../types/game'
import styles from './HomeScreen.module.css'

const BIOMES: Biome[] = ['beach', 'mountains', 'city']

export function HomeScreen() {
  const biome = useGameStore((s) => s.biome)
  const mode = useGameStore((s) => s.mode)
  const setBiome = useGameStore((s) => s.setBiome)
  const setMode = useGameStore((s) => s.setMode)
  const startFlight = useGameStore((s) => s.startFlight)

  return (
    <div className={styles.home}>
      <div className={styles.heroBg} aria-hidden />
      <div className={styles.heroContent}>
        <h1 className={styles.brand}>HangGlider</h1>
        <p className={styles.tagline}>Feel the lift</p>

        <div className={styles.pickerSection}>
          <span className={styles.sectionLabel}>Scenery</span>
          <div className={styles.biomePicker}>
            {BIOMES.map((b) => {
              const cfg = BIOME_CONFIGS[b]
              return (
                <button
                  key={b}
                  type="button"
                  className={`${styles.biomeBtn} ${biome === b ? styles.biomeActive : ''}`}
                  onClick={() => setBiome(b)}
                >
                  <span className={styles.biomeName}>{cfg.name}</span>
                  <span className={styles.biomeTag}>{cfg.tagline}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.pickerSection}>
          <span className={styles.sectionLabel}>Mode</span>
          <div className={styles.modePicker}>
            {(['free', 'challenge'] as GameMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`${styles.modeBtn} ${mode === m ? styles.modeActive : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'free' ? 'Free Flight' : 'Challenge'}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.flyBtn} onClick={startFlight}>
          Fly
        </button>
        <p className={styles.controlsHint}>
          Take off: Shift + ↓ climb · Land: slow + gentle descent
        </p>
      </div>
    </div>
  )
}
