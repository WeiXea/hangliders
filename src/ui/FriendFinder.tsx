import { useEffect, useState } from 'react'
import { useGameStore } from '../game/gameStore'
import { bearingTo, horizontalDist } from '../game/multiplayerSocial'
import { getLookOffsets } from '../game/lookCamera'
import styles from './FriendFinder.module.css'

/** Edge arrow + mini radar so multiplayer partners can find each other. */
export function FriendFinder() {
  const flight = useGameStore((s) => s.flight)
  const remote = useGameStore((s) => s.remoteFlight)
  const connected = useGameStore((s) => s.peerConnected)
  const remoteName = useGameStore((s) => s.remoteName)
  const [, setTick] = useState(0)

  useEffect(() => {
    let id = 0
    const loop = () => {
      setTick((n) => n + 1)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])

  if (!connected || !remote) return null
  if (flight.tandemRole !== 'none') return null

  const dist = horizontalDist(flight.position, remote.position)
  const bearing = bearingTo(flight.position, remote.position)
  const lookYaw = getLookOffsets().yaw
  let rel = bearing - flight.yaw - lookYaw
  while (rel > Math.PI) rel -= Math.PI * 2
  while (rel < -Math.PI) rel += Math.PI * 2
  const relDeg = (rel * 180) / Math.PI
  const ahead = Math.abs(rel) < 0.45 && dist > 4
  const altDelta = remote.position.y - flight.position.y

  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.radar}>
        <div className={styles.radarRing} />
        <div className={styles.radarYou} />
        <div
          className={styles.radarBlip}
          style={{
            transform: `translate(-50%, -50%) rotate(${relDeg}deg) translateY(-28px)`,
          }}
        />
        <span className={styles.radarDist}>{Math.round(dist)}m</span>
      </div>

      {!ahead && Math.abs(relDeg) > 25 && (
        <div
          className={styles.edgeArrow}
          style={{ transform: `translate(-50%, -50%) rotate(${relDeg}deg)` }}
        >
          <span className={styles.arrowGlyph}>▲</span>
          <span
            className={styles.arrowLabel}
            style={{ transform: `rotate(${-relDeg}deg)` }}
          >
            {remoteName || 'Friend'} · {Math.round(dist)}m
            {altDelta > 8 ? ' ↑' : altDelta < -8 ? ' ↓' : ''}
          </span>
        </div>
      )}

      {ahead && dist > 8 && (
        <div className={styles.aheadHint}>
          {remoteName || 'Friend'} ahead · {Math.round(dist)}m
        </div>
      )}
    </div>
  )
}
