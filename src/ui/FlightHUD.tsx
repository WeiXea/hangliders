import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../game/gameStore'
import {
  calibrateTiltNow,
  useKeyboardControls,
  useMouseLook,
  useTiltControls,
  useTouchControl,
} from '../game/controls'
import { nearestMountable } from '../game/flightPhysics'
import { nearestTrafficVehicle } from '../game/trafficRegistry'
import { VEHICLE_BOARD_RANGE } from '../types/game'
import { canSocialEmote } from '../game/multiplayerSocial'
import { canOfferTandem, tandemButtonLabel } from '../game/tandem'
import { pulseAction } from '../game/actionPulses'
import { startWindAudio, stopWindAudio } from '../game/audio'
import { nearestThermal, thermalHint } from '../game/atmosphere'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import {
  readTutorialDone,
  tutorialCopy,
  writeTutorialDone,
  type TutorialStep,
} from '../game/tutorial'
import { xcProgressLabel, xcNavTarget, xcElapsedMs, formatXCTime, xcRelBearing } from '../game/xcTask'
import { nearestEnterableDoor, sampleCitySupport, nearestElevatorBuilding } from '../game/cityBuildings'
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
  const xcTask = useGameStore((s) => s.xcTask)
  const parkedGliders = useGameStore((s) => s.parkedGliders)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const cycleCamera = useGameStore((s) => s.cycleCamera)
  const startFlight = useGameStore((s) => s.startFlight)
  const goHome = useGameStore((s) => s.goHome)
  const tiltSupported = useGameStore((s) => s.tiltSupported)
  const tiltEnabled = useGameStore((s) => s.tiltEnabled)
  const tiltPermission = useGameStore((s) => s.tiltPermission)
  const setTiltEnabled = useGameStore((s) => s.setTiltEnabled)
  const endFlightFromWalk = useGameStore((s) => s.endFlightFromWalk)
  const cityLaunchLabel = useGameStore((s) => s.cityLaunchLabel)
  const [tiltBusy, setTiltBusy] = useState(false)
  const [tutorialOn, setTutorialOn] = useState(() => !readTutorialDone())
  const [tutStep, setTutStep] = useState<TutorialStep>('speed')

  useKeyboardControls()
  useTiltControls()
  useMouseLook()

  // Keep audio context warm on first gesture
  useEffect(() => {
    const warm = () => {
      startWindAudio(0, 'grounded')
      window.removeEventListener('pointerdown', warm)
    }
    window.addEventListener('pointerdown', warm, { once: true })
    return () => window.removeEventListener('pointerdown', warm)
  }, [])

  // Advance first-flight coach: speed → climb → thermal → land
  useEffect(() => {
    if (!tutorialOn || tutStep === 'done') return
    if (tutStep === 'speed' && flight.airspeed >= 11) setTutStep('climb')
    else if (tutStep === 'climb' && flight.phase === 'flying' && flight.altitude > 3) {
      setTutStep('thermal')
    } else if (
      tutStep === 'thermal' &&
      (flight.timeInLift > 2.5 || flight.velocity.y > 0.8)
    ) {
      setTutStep('land')
    } else if (
      tutStep === 'land' &&
      (flight.phase === 'walking' || flight.phase === 'landed' || flight.phase === 'crashed')
    ) {
      setTutStep('done')
      writeTutorialDone()
      setTutorialOn(false)
    }
  }, [
    tutorialOn,
    tutStep,
    flight.airspeed,
    flight.phase,
    flight.altitude,
    flight.timeInLift,
    flight.velocity.y,
  ])

  const tut = useMemo(
    () => (tutorialOn ? tutorialCopy(tutStep) : null),
    [tutorialOn, tutStep],
  )

  const passedRings = rings.filter((r) => r.passed).length
  const vs = flight.velocity.y
  const vsLabel =
    Math.abs(vs) < 0.15 ? '0.0' : `${vs >= 0 ? '+' : ''}${vs.toFixed(1)}`
  const vsClass = vs > 0.35 ? styles.vsUp : vs < -0.35 ? styles.vsDown : ''
  const onGround = flight.phase === 'grounded' || flight.phase === 'running'
  const walking = flight.phase === 'walking'
  const freefall = flight.phase === 'freefall'
  const parachuting = flight.phase === 'parachuting'
  const flying = flight.phase === 'flying'
  const heli = flight.phase === 'helicopter'
  const driving = flight.phase === 'driving'
  const canUnmount = onGround && flight.airspeed < 3.2
  const peerConnected = useGameStore((s) => s.peerConnected)
  const remoteName = useGameStore((s) => s.remoteName)
  const remoteFlight = useGameStore((s) => s.remoteFlight)
  const canLift = onGround && flight.airspeed >= 11
  const canJump = flying && flight.altitude >= JUMP_MIN_ALTITUDE
  const biome = useGameStore((s) => s.biome)
  const simTime = useGameStore((s) => s.simTime)
  const config = BIOME_CONFIGS[biome]
  const nearMount = nearestMountable(flight, parkedGliders, (x, z) =>
    biome === 'city'
      ? sampleCitySupport(x, z, config.getHeight).y
      : config.getHeight(x, z),
  )
  const nearFriend = canSocialEmote(flight, remoteFlight)
  const tandemOk = peerConnected && canOfferTandem(flight, remoteFlight)
  const inTandem = flight.tandemRole !== 'none'
  const approach =
    flying &&
    flight.altitude < 35 &&
    flight.airspeed <= 14 &&
    flight.velocity.y < 0.5
  const flareCue =
    flying &&
    flight.altitude < 22 &&
    flight.altitude > 2 &&
    flight.velocity.y < -0.3 &&
    !flight.stallWarning
  const airLift = flying ? thermalHint(config, simTime, flight.position) : 0
  const nearTh = flying
    ? nearestThermal(biome, simTime, flight.position, flight.yaw)
    : null
  const liftPct = Math.max(0, Math.min(1, (airLift + 0.4) / 4.2))
  const liftHot = airLift > 0.85
  const liftWarm = airLift > 0.35

  useEffect(() => {
    startWindAudio(flight.airspeed, flight.phase, flight.roll, airLift)
  }, [flight.airspeed, flight.phase, flight.roll, airLift])

  useEffect(() => () => stopWindAudio(), [])

  const xcNav = mode === 'xc' && xcTask ? xcNavTarget(xcTask) : null
  const xcDist = xcNav
    ? Math.hypot(xcNav.x - flight.position.x, xcNav.z - flight.position.z)
    : 0
  const xcBearing = xcNav
    ? xcRelBearing(flight.yaw, flight.position, xcNav)
    : 0
  const xcTimeMs = xcTask ? xcElapsedMs(xcTask) : null
  const nearDoor =
    walking &&
    biome === 'city' &&
    flight.interiorId < 0 &&
    nearestEnterableDoor(flight.position.x, flight.position.z, config.getHeight)
  const roofElevIds = [
    ...new Set(
      parkedGliders
        .filter((g) => g.available && g.buildingId != null)
        .map((g) => g.buildingId!),
    ),
  ]
  const nearVehicle =
    walking &&
    biome === 'city' &&
    nearestTrafficVehicle(flight.position.x, flight.position.z, VEHICLE_BOARD_RANGE)
  const nearElev =
    walking &&
    biome === 'city' &&
    flight.interiorId < 0 &&
    !nearMount &&
    !nearVehicle &&
    nearestElevatorBuilding(
      flight.position.x,
      flight.position.z,
      flight.position.y,
      roofElevIds,
      config.getHeight,
    )
  const onRoof =
    walking &&
    biome === 'city' &&
    flight.interiorId < 0 &&
    sampleCitySupport(flight.position.x, flight.position.z, config.getHeight).onRoof
  const inside = walking && flight.interiorId >= 0

  const thermalCue = (() => {
    if (!flying || !nearTh || flight.stallWarning) return null
    if (nearTh.inCore && vs > 0.2) {
      return `Core lift — circle to stay · ${vs >= 0 ? '+' : ''}${vs.toFixed(1)} m/s`
    }
    if (nearTh.inColumn) {
      return 'In the column — bank toward the green core'
    }
    if (nearTh.dist < nearTh.radius * 2.4) {
      const abs = Math.abs(nearTh.relBearing)
      if (abs < 0.35) return `Thermal ahead · ${Math.round(nearTh.dist)} m`
      if (nearTh.relBearing > 0) return `Thermal to the right · ${Math.round(nearTh.dist)} m`
      return `Thermal to the left · ${Math.round(nearTh.dist)} m`
    }
    if (liftHot) return `Rising air — climb ${vs.toFixed(1)} m/s`
    return null
  })()

  const inLift = flying && (vs > 0.6 || liftHot)
  const heavySink = flying && vs < -2.2 && airLift < 0.2

  const onToggleTilt = async () => {
    setTiltBusy(true)
    try {
      await setTiltEnabled(!tiltEnabled)
    } finally {
      setTiltBusy(false)
    }
  }

  const showSteerPads =
    !tiltEnabled || walking || driving || freefall || parachuting || heli

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
            <span className={styles.instrumentLabel}>Vario</span>
            <span className={`${styles.instrumentValue} ${vsClass}`}>{vsLabel}</span>
            <span className={styles.instrumentUnit}>m/s</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.instrument}>
            <span className={styles.instrumentLabel}>Thermal</span>
            <div
              className={styles.liftMeter}
              title={
                airLift > 0.2
                  ? `Rising air ${airLift.toFixed(1)} m/s — circle green columns`
                  : 'No lift here — fly into a green thermal column'
              }
            >
              <div
                className={`${styles.liftFill} ${liftHot ? styles.liftHot : liftWarm ? styles.liftWarm : ''}`}
                style={{ height: `${Math.round(liftPct * 100)}%` }}
              />
            </div>
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
          {mode === 'xc' && xcTask && (
            <>
              <div className={styles.divider} />
              <div className={styles.instrument}>
                <span className={styles.instrumentLabel}>XC</span>
                <span className={styles.instrumentValue} style={{ fontSize: 12 }}>
                  {xcProgressLabel(xcTask)}
                </span>
              </div>
              {xcTimeMs != null && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.instrument}>
                    <span className={styles.instrumentLabel}>Time</span>
                    <span className={styles.instrumentValue} style={{ fontSize: 18 }}>
                      {formatXCTime(xcTimeMs)}
                    </span>
                  </div>
                </>
              )}
              {xcNav && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.instrument}>
                    <span className={styles.instrumentLabel}>TP</span>
                    <span className={styles.instrumentValue}>{Math.round(xcDist)}</span>
                    <span className={styles.instrumentUnit}>m</span>
                  </div>
                </>
              )}
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

      {mode === 'xc' && xcNav && (flying || freefall || parachuting) && (
        <div className={styles.xcCompass} aria-hidden>
          <div
            className={styles.xcArrow}
            style={{ transform: `rotate(${xcBearing}rad)` }}
          />
          <span className={styles.xcCompassLabel}>{xcNav.label}</span>
        </div>
      )}

      {tiltPermission === 'denied' && (
        <div className={styles.coach}>Motion access denied — enable it in Safari Settings</div>
      )}

      {tut && !flight.stallWarning && (
        <div className={styles.tutorial}>
          <div className={styles.tutorialTitle}>{tut.title}</div>
          <div className={styles.tutorialBody}>{tut.body}</div>
          <button
            type="button"
            className={styles.tutorialSkip}
            onClick={() => {
              writeTutorialDone()
              setTutorialOn(false)
              setTutStep('done')
            }}
          >
            Skip tips
          </button>
        </div>
      )}

      {flight.stallWarning && flying && (
        <div className={styles.stallWarning}>Stall — ease the bar forward / build speed</div>
      )}

      {thermalCue && !flight.stallWarning && !tut && (
        <div className={`${styles.nearGround} ${liftHot ? styles.liftBanner : ''}`}>
          {thermalCue}
        </div>
      )}

      {inLift && !flight.stallWarning && !thermalCue && !tut && (
        <div className={styles.nearGround}>Lift! Center the thermal — climb {vs.toFixed(1)} m/s</div>
      )}

      {heavySink && !flight.stallWarning && !thermalCue && !tut && (
        <div className={styles.coach}>Strong sink — turn toward a green thermal column</div>
      )}

      {onGround && !tut && (
        <div className={styles.coach}>
          {canUnmount
            ? 'Parked — press E / Unmount to hop off and walk'
            : biome === 'city' && cityLaunchLabel && flight.phase === 'grounded'
              ? `${cityLaunchLabel} — build speed, then dive off the roof`
              : tiltEnabled
                ? canLift
                  ? 'Speed ready — pull the iPad back to climb and lift off'
                  : 'Hold + to build speed, then pull back to take off'
                : canLift
                  ? 'Speed ready — hold ↓ Climb to lift off'
                  : 'Hold + / Shift to build speed, then ↓ Climb to take off'}
        </div>
      )}

      {driving && (
        <div className={styles.coach}>
          Drive · ↑ gas · ↓ brake · A/D steer (heavier at speed) · E exit when stopped
        </div>
      )}

      {flying && !canJump && flight.altitude >= 10 && (
        <div className={styles.coach}>
          Climb to {JUMP_MIN_ALTITUDE}m to jump — Alt {Math.round(flight.altitude)}m
        </div>
      )}

      {canJump && (
        <div className={styles.nearGround}>Jump ready — Space or J · then F for chute</div>
      )}

      {peerConnected && !inTandem && (
        <div className={styles.coach}>
          Multiplayer · {remoteName || 'Friend'} — radar · look: Alt+←→↓ or hold right-click drag · Q/E/B
        </div>
      )}

      {inTandem && (
        <div className={styles.nearGround}>
          {flight.tandemRole === 'pilot'
            ? `Tandem pilot — friend presses Board nearby · T to leave`
            : `Tandem passenger — Jump = freefall + chute · T = leave`}
        </div>
      )}

      {tandemOk && !inTandem && (
        <div className={styles.nearGround}>
          {remoteName || 'Friend'} nearby — press T or Board tandem
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

      {walking &&
        !nearMount &&
        !nearVehicle &&
        !nearDoor &&
        !nearElev &&
        !inside &&
        !onRoof &&
        flight.landAction === 'none' && (
        <div className={styles.coach}>
          Green-ring cars are parked — walk up and press E · or stand in a moving car&apos;s path to stop it
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
        <div className={styles.nearGround}>
          {(nearMount.craftType ?? 'glider') === 'helicopter'
            ? 'Chopper ready — press E to board'
            : 'Hang glider nearby — press E / Mount to fly again'}
        </div>
      )}

      {walking && nearVehicle && !nearMount && (
        <div className={styles.nearGround}>
          {nearVehicle.parked
            ? 'Parked car — press E to drive'
            : nearVehicle.speed < 1.2
              ? nearVehicle.kind === 'bus'
                ? 'Bus stopped — press E to drive'
                : 'Vehicle stopped — press E to hop in'
              : 'In its path — wait for it to stop, then press E'}
        </div>
      )}

      {heli && (
        <div className={styles.coach}>
          Chopper · ↑ forward · ↓ climb · − descend · A/D yaw · E land when idle
        </div>
      )}

      {approach && !flareCue && (
        <div className={styles.nearGround}>
          Good approach — keep slow and sink gently to land & walk
        </div>
      )}

      {flareCue && !tut && !flight.stallWarning && (
        <div className={styles.nearGround}>
          Flare! Ease ↑ Climb and bleed speed for a soft walk-off
        </div>
      )}

      {nearElev && (
        <div className={styles.nearGround}>
          {nearElev.toRoof
            ? 'Green elevator — press E to ride up to the rooftop craft'
            : 'Roof hatch — press E to ride the elevator back to the street'}
        </div>
      )}

      {nearDoor && !nearMount && !nearVehicle && !nearElev && (
        <div className={styles.nearGround}>Green door mat — press E / Mount to enter</div>
      )}

      {inside && (
        <div className={styles.coach}>Inside — press E near the doorway to leave</div>
      )}

      {onRoof && !nearDoor && !nearMount && !nearElev && flight.landAction === 'none' && (
        <div className={styles.coach}>Rooftop — mount a green-ringed glider or ride the elevator down</div>
      )}

      {freefall && (
        <div className={styles.centerActions}>
          <button
            type="button"
            className={styles.bigChute}
            onPointerDown={(e) => {
              e.preventDefault()
              pulseAction('deployChute')
              useGameStore.getState().setInput({ deployChute: true })
            }}
          >
            CHUTE
            <span className={styles.bigJumpSub}>Deploy parachute · F</span>
          </button>
        </div>
      )}

      {tandemOk && (
        <div className={styles.centerActions}>
          <button
            type="button"
            className={styles.bigTandem}
            onPointerDown={(e) => {
              e.preventDefault()
              pulseAction('tandem')
              useGameStore.getState().setInput({ tandem: true })
            }}
          >
            {tandemButtonLabel(flight, remoteFlight)}
            <span className={styles.bigJumpSub}>Press T · within {Math.round(18)}m</span>
          </button>
        </div>
      )}

      <div className={styles.controls}>
        {showSteerPads && (
          <div className={styles.leftPads}>
            <ControlPad
              label="↑"
              sub={
                walking || driving
                  ? 'Fwd'
                  : freefall || parachuting
                    ? 'Brake'
                    : heli
                      ? 'Fwd'
                      : 'Dive'
              }
              action="pitchDown"
              className={styles.padUp}
              active={input.pitchDown}
            />
            <div className={styles.padRow}>
              <ControlPad label="←" sub="Left" action="bankLeft" active={input.bankLeft} />
              <ControlPad
                label="↓"
                sub={
                  walking
                    ? 'Back'
                    : driving
                      ? 'Brake'
                      : freefall || parachuting
                        ? 'Sink'
                        : heli
                          ? 'Climb'
                          : 'Climb'
                }
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
                label={nearVehicle && !nearMount ? 'Drive' : 'Mount'}
                sub={nearMount || nearVehicle ? 'Ready' : 'Near'}
                action="interact"
                className={nearMount || nearVehicle ? styles.padLand : styles.padAction}
                active={input.interact}
              />
              {flight.airtime >= 2.5 && (
                <button
                  type="button"
                  className={`${styles.pad} ${styles.padLand}`}
                  onClick={() => endFlightFromWalk()}
                >
                  <span className={styles.padLabel}>End</span>
                  <span className={styles.padSub}>Results</span>
                </button>
              )}
            </>
          )}
          {tandemOk && (
            <ControlPad
              label={inTandem ? 'Leave' : 'Tandem'}
              sub="T"
              action="tandem"
              className={styles.padLand}
              active={input.tandem || inTandem}
            />
          )}
          {!walking && !freefall && (
            <>
              <ControlPad
                label="+"
                sub={driving ? 'Gas' : 'Speed'}
                action="speedUp"
                className={styles.padSpeed}
                active={input.speedUp}
              />
              <ControlPad
                label="−"
                sub={driving ? 'Brake' : 'Slow'}
                action="speedDown"
                className={styles.padSpeed}
                active={input.speedDown}
              />
            </>
          )}
          {walking && (
            <ControlPad label="Sprint" sub="Shift" action="speedUp" className={styles.padSpeed} active={input.speedUp} />
          )}
          {(driving || canUnmount) && (
            <ControlPad
              label={driving ? 'Exit' : 'Unmount'}
              sub="E"
              action="interact"
              className={styles.padLand}
              active={input.interact}
            />
          )}
        </div>
      </div>
    </div>
  )
}
