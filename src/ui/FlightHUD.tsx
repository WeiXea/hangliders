import { useEffect, useState } from 'react'
import { useGameStore } from '../game/gameStore'
import {
  calibrateTiltNow,
  useKeyboardControls,
  useMouseLook,
  useTiltControls,
  useTouchControl,
} from '../game/controls'
import { nearestMountable } from '../game/flightPhysics'
import { canOfferTandem, canSocialEmote } from '../game/multiplayerSocial'
import { startWindAudio, stopWindAudio } from '../game/audio'
import { GameCanvas } from '../game/GameCanvas'
import { JUMP_MIN_ALTITUDE } from '../types/game'
import { FriendFinder } from './FriendFinder'
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
  const parkedGliders = useGameStore((s) => s.parkedGliders)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const cycleCamera = useGameStore((s) => s.cycleCamera)
  const startFlight = useGameStore((s) => s.startFlight)
  const goHome = useGameStore((s) => s.goHome)
  const tiltSupported = useGameStore((s) => s.tiltSupported)
  const tiltEnabled = useGameStore((s) => s.tiltEnabled)
  const tiltPermission = useGameStore((s) => s.tiltPermission)
  const setTiltEnabled = useGameStore((s) => s.setTiltEnabled)
  const [tiltBusy, setTiltBusy] = useState(false)

  useKeyboardControls()
  useTiltControls()
  useMouseLook()

  useEffect(() => {
    startWindAudio(flight.airspeed, flight.phase)
    return () => stopWindAudio()
  }, [flight.airspeed, flight.phase])

  const passedRings = rings.filter((r) => r.passed).length
  const vs = flight.velocity.y
  const vsLabel = vs > 0.35 ? `↑${Math.abs(vs).toFixed(0)}` : vs < -0.35 ? `↓${Math.abs(vs).toFixed(0)}` : '—'
  const vsClass = vs > 0.35 ? styles.vsUp : vs < -0.35 ? styles.vsDown : ''
  const onGround = flight.phase === 'grounded' || flight.phase === 'running'
  const walking = flight.phase === 'walking'
  const freefall = flight.phase === 'freefall'
  const parachuting = flight.phase === 'parachuting'
  const flying = flight.phase === 'flying'
  const peerConnected = useGameStore((s) => s.peerConnected)
  const remoteName = useGameStore((s) => s.remoteName)
  const remoteFlight = useGameStore((s) => s.remoteFlight)
  const canLift = onGround && flight.airspeed >= 13
  const canJump = flying && flight.altitude >= JUMP_MIN_ALTITUDE
  const nearMount = nearestMountable(flight, parkedGliders)
  const nearFriend = canSocialEmote(flight, remoteFlight)
  const tandemOk = peerConnected && canOfferTandem(flight, remoteFlight)
  const inTandem = flight.tandemRole !== 'none'
  const approach =
    flying &&
    flight.altitude < 35 &&
    flight.airspeed <= 14 &&
    flight.velocity.y < 0.5

  const onToggleTilt = async () => {
    setTiltBusy(true)
    try {
      await setTiltEnabled(!tiltEnabled)
    } finally {
      setTiltBusy(false)
    }
  }

  const showSteerPads =
    !tiltEnabled || walking || freefall || parachuting

  return (
    <div className={styles.hud}>
      <GameCanvas />
      <div className={cameraMode === 'fpv' ? styles.fpvFrame : styles.viewFrame} aria-hidden />
      {peerConnected && <FriendFinder />}

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
        <div className={styles.topActions}>
          {tiltSupported && !walking && (
            <>
              <button
                type="button"
                className={`${styles.cameraBtn} ${tiltEnabled ? styles.tiltOn : ''}`}
                onClick={onToggleTilt}
                disabled={tiltBusy}
                title="Steer by tilting the device"
              >
                {tiltEnabled ? 'Tilt · On' : 'Tilt'}
              </button>
              {tiltEnabled && (
                <button
                  type="button"
                  className={styles.cameraBtn}
                  onClick={() => calibrateTiltNow()}
                  title="Set current angle as neutral"
                >
                  Level
                </button>
              )}
            </>
          )}
          <button type="button" className={styles.cameraBtn} onClick={cycleCamera} title="Press C">
            Cam · {CAMERA_LABELS[cameraMode]}
          </button>
          <button type="button" className={styles.restartBtn} onClick={startFlight} title="Press R">
            Restart
          </button>
          <button type="button" className={styles.homeMiniBtn} onClick={goHome} title="Esc">
            Home
          </button>
        </div>
      </header>

      {tiltPermission === 'denied' && (
        <div className={styles.coach}>Motion access denied — enable it in Safari Settings</div>
      )}

      {flight.stallWarning && flying && (
        <div className={styles.stallWarning}>Stall — speed up (Shift)</div>
      )}

      {onGround && (
        <div className={styles.coach}>
          {tiltEnabled
            ? canLift
              ? 'Speed ready — pull the iPad back to climb and lift off'
              : 'Hold + to build speed, then pull back to take off'
            : canLift
              ? 'Speed ready — hold ↓ Climb to lift off'
              : 'Hold + / Shift to build speed, then ↓ Climb to take off'}
        </div>
      )}

      {flying && !canJump && flight.altitude >= 10 && (
        <div className={styles.coach}>
          Climb to {JUMP_MIN_ALTITUDE}m to jump — Alt {Math.round(flight.altitude)}m
        </div>
      )}

      {canJump && (
        <div className={styles.nearGround}>Jump ready — press Space (or J)</div>
      )}

      {peerConnected && !inTandem && (
        <div className={styles.coach}>
          Multiplayer · {remoteName || 'Friend'} — radar · look: Alt+←→↓ or hold right-click drag · Q/E/B
        </div>
      )}

      {inTandem && (
        <div className={styles.nearGround}>
          {flight.tandemRole === 'pilot'
            ? `Tandem pilot — ${remoteName || 'friend'} is riding with you (T to leave)`
            : `Tandem passenger — hang on · Jump/T to hop off`}
        </div>
      )}

      {flight.tandemWant && !inTandem && (
        <div className={styles.coach}>
          Waiting for {remoteName || 'friend'} to press Tandem too…
        </div>
      )}

      {freefall && (
        <div className={styles.stallWarning}>Freefall — deploy parachute (F / Chute)</div>
      )}

      {parachuting && (
        <div className={styles.nearGround}>
          {flight.chuteInflation < 0.95
            ? 'Canopy opening — hold steady…'
            : flight.altitude < 14
              ? 'Flare! Hold ↑ / Climb to soften the landing'
              : 'Steer toggles · ↑ brake / flare · ↓ drive forward'}
        </div>
      )}

      {walking && !nearMount && flight.landAction === 'none' && (
        <div className={styles.coach}>
          Explore — Wave · Dance · Sit (1 / 2 / 3) · find gold-ringed gliders
        </div>
      )}

      {walking && flight.landAction !== 'none' && (
        <div className={styles.nearGround}>
          {flight.landAction === 'wave' && 'Waving — press 1 again to stop'}
          {flight.landAction === 'dance' && 'Dancing — press 2 again to stop'}
          {flight.landAction === 'sit' && 'Sitting — move or press 3 to stand'}
          {flight.landAction === 'hug' && 'Hugging — move to stop'}
          {flight.landAction === 'highfive' && 'High five — move to stop'}
        </div>
      )}

      {nearFriend && flight.landAction === 'none' && (
        <div className={styles.nearGround}>
          Next to {remoteName || 'friend'} — Hug (4) · High five (5)
        </div>
      )}

      {walking && nearMount && (
        <div className={styles.nearGround}>Hang glider nearby — press E / Mount to fly again</div>
      )}

      {approach && (
        <div className={styles.nearGround}>
          Good approach — keep slow and sink gently to land & walk
        </div>
      )}

      {freefall && (
        <div className={styles.centerActions}>
          <button
            type="button"
            className={styles.bigChute}
            onPointerDown={(e) => {
              e.preventDefault()
              useGameStore.getState().setInput({ deployChute: true })
            }}
          >
            CHUTE
            <span className={styles.bigJumpSub}>Deploy parachute · F</span>
          </button>
        </div>
      )}

      <div className={styles.controls}>
        {showSteerPads && (
          <div className={styles.leftPads}>
            <ControlPad
              label="↑"
              sub={walking ? 'Fwd' : freefall || parachuting ? 'Brake' : 'Dive'}
              action="pitchDown"
              className={styles.padUp}
              active={input.pitchDown}
            />
            <div className={styles.padRow}>
              <ControlPad label="←" sub="Left" action="bankLeft" active={input.bankLeft} />
              <ControlPad
                label="↓"
                sub={walking ? 'Back' : freefall || parachuting ? 'Sink' : 'Climb'}
                action="pitchUp"
                active={input.pitchUp}
              />
              <ControlPad label="→" sub="Right" action="bankRight" active={input.bankRight} />
            </div>
          </div>
        )}
        {tiltEnabled && !showSteerPads && (
          <div className={styles.tiltHint} aria-live="polite">
            <span className={styles.tiltHintTitle}>Steer like a wheel</span>
            <span className={styles.tiltHintSub}>Turn left/right · Pull back to climb · Push to dive</span>
          </div>
        )}
        <div className={styles.rightPads}>
          {freefall && (
            <ControlPad
              label="Chute"
              sub="Deploy"
              action="deployChute"
              className={styles.padLand}
              active={input.deployChute}
            />
          )}
          {walking && (
            <>
              <ControlPad label="Jump" sub="Hop" action="jump" className={styles.padAction} active={input.jump} />
              <ControlPad
                label="Wave"
                sub="1"
                action="emoteWave"
                className={flight.landAction === 'wave' ? styles.padLand : styles.padAction}
                active={input.emoteWave || flight.landAction === 'wave'}
              />
              <ControlPad
                label="Dance"
                sub="2"
                action="emoteDance"
                className={flight.landAction === 'dance' ? styles.padLand : styles.padAction}
                active={input.emoteDance || flight.landAction === 'dance'}
              />
              <ControlPad
                label="Sit"
                sub="3"
                action="emoteSit"
                className={flight.landAction === 'sit' ? styles.padLand : styles.padAction}
                active={input.emoteSit || flight.landAction === 'sit'}
              />
              {nearFriend && (
                <>
                  <ControlPad
                    label="Hug"
                    sub="4"
                    action="emoteHug"
                    className={flight.landAction === 'hug' ? styles.padLand : styles.padAction}
                    active={input.emoteHug || flight.landAction === 'hug'}
                  />
                  <ControlPad
                    label="High five"
                    sub="5"
                    action="emoteHighFive"
                    className={flight.landAction === 'highfive' ? styles.padLand : styles.padAction}
                    active={input.emoteHighFive || flight.landAction === 'highfive'}
                  />
                </>
              )}
              <ControlPad
                label="Mount"
                sub={nearMount ? 'Ready' : 'Near'}
                action="interact"
                className={nearMount ? styles.padLand : styles.padAction}
                active={input.interact}
              />
            </>
          )}
          {tandemOk && (
            <ControlPad
              label={inTandem ? 'Leave' : flight.tandemWant ? 'Waiting…' : 'Tandem'}
              sub="T"
              action="tandem"
              className={inTandem || flight.tandemWant ? styles.padLand : styles.padAction}
              active={input.tandem || flight.tandemWant || inTandem}
            />
          )}
          {!walking && !freefall && (
            <>
              <ControlPad label="+" sub="Speed" action="speedUp" className={styles.padSpeed} active={input.speedUp} />
              <ControlPad label="−" sub="Slow" action="speedDown" className={styles.padSpeed} active={input.speedDown} />
            </>
          )}
          {walking && (
            <ControlPad label="Sprint" sub="Shift" action="speedUp" className={styles.padSpeed} active={input.speedUp} />
          )}
        </div>
      </div>
    </div>
  )
}
