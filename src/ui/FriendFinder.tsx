import { useMemo } from 'react'
import { useGameStore } from '../game/gameStore'
import { bearingTo, horizontalDist } from '../game/multiplayerSocial'
import styles from './FriendFinder.module.css'

/** Edge arrow + mini radar so multiplayer partners can find each other. */
export function FriendFinder() {
  const flight = useGameStore((s) => s.flight)
  const remote = useGameStore((s) => s.remoteFlight)
  const connected = useGameStore((s) => s.peerConnected)
  const remoteName = useGameStore((s) => s.remoteName)
  const input = useGameStore((s) => s.input)

  const info = useMemo(() => {
    if (!connected || !remote) return null
    if (flight.tandemRole !== 'none') return null
    const dist = horizontalDist(flight.position, remote.position)
    const bearing = bearingTo(flight.position, remote.position)
    const look =
      input.lookBack ? Math.PI : input.lookLeft ? Math.PI * 0.55 : input.lookRight ? -Math.PI * 0.55 : 0
    let rel = bearing - flight.yaw - look
    while (rel > Math.PI) rel -= Math.PI * 2
    while (rel < -Math.PI) rel += Math.PI * 2
    const ahead = Math.abs(rel) < 0.45 && dist > 4
    return { dist, relDeg: (rel * 180) / Math.PI, ahead, altDelta: remote.position.y - flight.position.y }
  }, [connected, remote, flight, input.lookBack, input.lookLeft, input.lookRight])

  if (!info) return null

  const edge =
    Math.abs(info.relDeg) > 25
      ? {
          transform: `translate(-50%, -50%) rotate(${info.relDeg}deg)`,
        }
      : null

  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.radar}>
        <div className={styles.radarRing} />
        <div className={styles.radarYou} />
        <div
          className={styles.radarBlip}
          style={{
            transform: `translate(-50%, -50%) rotate(${info.relDeg}deg) translateY(-28px)`,
          }}
        />
        <span className={styles.radarDist}>{Math.round(info.dist)}m</span>
      </div>

      {!info.ahead && edge && (
        <div className={styles.edgeArrow} style={edge}>
          <span className={styles.arrowGlyph}>▲</span>
          <span
            className={styles.arrowLabel}
            style={{ transform: `rotate(${-info.relDeg}deg)` }}
          >
            {remoteName || 'Friend'} · {Math.round(info.dist)}m
            {info.altDelta > 8 ? ' ↑' : info.altDelta < -8 ? ' ↓' : ''}
          </span>
        </div>
      )}

      {info.ahead && info.dist > 8 && (
        <div className={styles.aheadHint}>
          {remoteName || 'Friend'} ahead · {Math.round(info.dist)}m
        </div>
      )}
    </div>
  )
}
