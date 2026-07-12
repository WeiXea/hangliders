import { useEffect } from 'react'
import { useGameStore } from '../game/gameStore'
import { playLandingSound } from '../game/audio'
import styles from './ResultScreen.module.css'

export function ResultScreen() {
  const stats = useGameStore((s) => s.stats)
  const flight = useGameStore((s) => s.flight)
  const mode = useGameStore((s) => s.mode)
  const startFlight = useGameStore((s) => s.startFlight)
  const goHome = useGameStore((s) => s.goHome)

  const landed = flight.phase === 'landed'
  const crashed = flight.phase === 'crashed'

  useEffect(() => {
    if (landed) playLandingSound(true)
    else if (crashed) playLandingSound(false)
  }, [landed, crashed])

  if (!stats) return null

  const title = crashed ? 'Crash Landing' : landed ? 'Smooth Landing' : 'Flight Over'
  const subtitle = crashed
    ? 'Too fast or too steep — try again'
    : landed
      ? stats.landingQuality === 'perfect'
        ? 'Textbook flare — beautiful!'
        : 'You made it down safely'
      : 'Nice flying out there'

  return (
    <div className={styles.result}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>

        <div className={styles.scoreBlock}>
          <span className={styles.scoreLabel}>Score</span>
          <span className={styles.scoreValue}>{stats.score.toLocaleString()}</span>
        </div>

        <div className={styles.statsGrid}>
          <Stat label="Airtime" value={`${stats.airtime.toFixed(1)}s`} />
          <Stat label="Max Alt" value={`${Math.round(stats.maxAltitude)}m`} />
          <Stat label="Distance" value={`${Math.round(stats.distance)}m`} />
          <Stat label="Max climb" value={`+${stats.maxClimbRate.toFixed(1)} m/s`} />
          <Stat label="Time in lift" value={`${stats.timeInLift.toFixed(1)}s`} />
          {mode === 'challenge' && (
            <Stat label="Rings" value={`${stats.ringsPassed}/${stats.totalRings}`} />
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.retryBtn} onClick={startFlight}>
            Restart · R
          </button>
          <button type="button" className={styles.homeBtn} onClick={goHome}>
            Home · Esc
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}
