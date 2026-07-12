import { useEffect } from 'react'
import { useGameStore } from '../game/gameStore'
import { useKeyboardControls, useTouchControl } from '../game/controls'
import { startWindAudio, stopWindAudio } from '../game/audio'
import { GameCanvas } from '../game/GameCanvas'
import styles from './FlightHUD.module.css'

const CAMERA_LABELS = { chase: 'Chase', fpv: 'Cockpit', side: 'Side' } as const

function ControlPad({
  label,
  sub,
  action,
  className,
  active,
}: {
  label: string
  sub?: string
  action: Parameters<typeof useTouchControl>[0]
  className?: string
  active?: boolean
}) {
  const handlers = useTouchControl(action)
  return (
    <button
      type="button"
      className={`${styles.pad} ${className ?? ''} ${active ? styles.padActive : ''}`}
      aria-pressed={active}
      {...handlers}
    >
      <span className={styles.padLabel}>{label}</span>
      {sub && <span className={styles.padSub}>{sub}</span>}
    </button>
  )
}

export function FlightHUD() {
  const flight = useGameStore((s) => s.flight)
  const input = useGameStore((s) => s.input)
  const mode = useGameStore((s) => s.mode)
  const rings = useGameStore((s) => s.rings)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const cycleCamera = useGameStore((s) => s.cycleCamera)
  useKeyboardControls()

  useEffect(() => {
    startWindAudio(flight.airspeed, flight.phase)
    return () => stopWindAudio()
  }, [flight.airspeed, flight.phase])

  const passedRings = rings.filter((r) => r.passed).length
  const vs = flight.velocity.y
  const vsLabel = vs > 0.35 ? `↑${Math.abs(vs).toFixed(0)}` : vs < -0.35 ? `↓${Math.abs(vs).toFixed(0)}` : '—'
  const vsClass = vs > 0.35 ? styles.vsUp : vs < -0.35 ? styles.vsDown : ''
  const onGround = flight.phase === 'grounded' || flight.phase === 'running'
  const canLift = onGround && flight.airspeed >= 13
  const approach =
    flight.phase === 'flying' &&
    flight.altitude < 35 &&
    flight.airspeed <= 14 &&
    flight.velocity.y < 0.5

  return (
    <div className={styles.hud}>
      <GameCanvas />
      <div className={cameraMode === 'fpv' ? styles.fpvFrame : styles.viewFrame} aria-hidden />

      <header className={styles.topBar}>
        <div className={styles.instruments}>
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Alt</span>
            <span className={styles.instrumentValue}>{Math.round(flight.altitude)}</span>
            <span className={styles.instrumentUnit}>m</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Spd</span>
            <span className={`${styles.instrumentValue} ${flight.stallWarning ? styles.stall : ''} ${canLift ? styles.ready : ''}`}>
              {Math.round(flight.airspeed)}
            </span>
          </div>
          <div className={styles.divider} />
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>V/S</span>
            <span className={`${styles.instrumentValue} ${vsClass}`}>{vsLabel}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Dist</span>
            <span className={styles.instrumentValue}>{Math.round(flight.distance)}</span>
            <span className={styles.instrumentUnit}>m</span>
          </div>
          {mode === 'challenge' && (
            <>
              <div className={styles.divider} />
              <div className={styles.instrument}>
                <span className={styles.instrumentLabel}>Rings</span>
                <span className={styles.instrumentValue}>{passedRings}/{rings.length}</span>
              </div>
            </>
          )}
        </div>
        <button type="button" className={styles.cameraBtn} onClick={cycleCamera} title="Press C">
          Cam · {CAMERA_LABELS[cameraMode]}
        </button>
      </header>

      {flight.stallWarning && flight.phase === 'flying' && (
        <div className={styles.stallWarning}>Stall — speed up (Shift)</div>
      )}

      {onGround && (
        <div className={styles.coach}>
          {canLift
            ? 'Speed ready — hold ↓ Climb to lift off'
            : 'Hold + / Shift to build speed, then ↓ Climb to take off'}
        </div>
      )}

      {approach && (
        <div className={styles.nearGround}>
          Good approach — keep slow and sink gently to land
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.leftPads}>
          <ControlPad label="↑" sub="Dive" action="pitchDown" className={styles.padUp} active={input.pitchDown} />
          <div className={styles.padRow}>
            <ControlPad label="←" sub="Left" action="bankLeft" active={input.bankLeft} />
            <ControlPad label="↓" sub="Climb" action="pitchUp" active={input.pitchUp} />
            <ControlPad label="→" sub="Right" action="bankRight" active={input.bankRight} />
          </div>
        </div>
        <div className={styles.rightPads}>
          <ControlPad label="+" sub="Speed" action="speedUp" className={styles.padSpeed} active={input.speedUp} />
          <ControlPad label="−" sub="Slow" action="speedDown" className={styles.padSpeed} active={input.speedDown} />
        </div>
      </div>
    </div>
  )
}
