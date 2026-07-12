import { useState } from 'react'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { readStoredTiltPreference } from '../game/tilt'
import type { Biome, GameMode } from '../types/game'
import styles from './HomeScreen.module.css'

const BIOMES: Biome[] = ['beach', 'mountains', 'city']

export function HomeScreen() {
  const biome = useGameStore((s) => s.biome)
  const mode = useGameStore((s) => s.mode)
  const setBiome = useGameStore((s) => s.setBiome)
  const setMode = useGameStore((s) => s.setMode)
  const startFlight = useGameStore((s) => s.startFlight)
  const tiltSupported = useGameStore((s) => s.tiltSupported)
  const tiltEnabled = useGameStore((s) => s.tiltEnabled)
  const setTiltEnabled = useGameStore((s) => s.setTiltEnabled)
  const [tiltBusy, setTiltBusy] = useState(false)

  const onToggleTilt = async () => {
    setTiltBusy(true)
    try {
      await setTiltEnabled(!tiltEnabled)
    } finally {
      setTiltBusy(false)
    }
  }

  const onFly = async () => {
    if (tiltSupported && !tiltEnabled && readStoredTiltPreference()) {
      await setTiltEnabled(true)
    }
    startFlight()
  }

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

        {tiltSupported && (
          <div className={styles.pickerSection}>
            <span className={styles.sectionLabel}>Controls</span>
            <button
              type="button"
              className={`${styles.tiltToggle} ${tiltEnabled ? styles.modeActive : ''}`}
              onClick={onToggleTilt}
              disabled={tiltBusy}
            >
              {tiltEnabled ? 'Tilt steering · On' : 'Tilt steering · Off'}
            </button>
          </div>
        )}

        <button type="button" className={styles.flyBtn} onClick={onFly}>
          Fly
        </button>
        <p className={styles.controlsHint}>
          {tiltEnabled
            ? 'Hold landscape like a wheel — turn to bank · pull/push to pitch · Level to recalibrate'
            : 'Takeoff: Shift + ↓ climb · Land: slow + gentle sink · Enable tilt for iPad'}
        </p>
      </div>
    </div>
  )
}
