import { useState } from 'react'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { readStoredTiltPreference } from '../game/tilt'
import { hostRoom, joinRoom, makeRoomCode } from '../game/netRoom'
import { handleNetMessage, sendHello, setRoomSession } from '../game/netSync'
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
  const playerName = useGameStore((s) => s.playerName)
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const roomCode = useGameStore((s) => s.roomCode)
  const roomRole = useGameStore((s) => s.roomRole)
  const roomStatus = useGameStore((s) => s.roomStatus)
  const peerConnected = useGameStore((s) => s.peerConnected)
  const setRoomMeta = useGameStore((s) => s.setRoomMeta)
  const [tiltBusy, setTiltBusy] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [netBusy, setNetBusy] = useState(false)

  const onToggleTilt = async () => {
    setTiltBusy(true)
    try {
      await setTiltEnabled(!tiltEnabled)
    } finally {
      setTiltBusy(false)
    }
  }

  const prepareFlight = async () => {
    if (tiltSupported && !tiltEnabled && readStoredTiltPreference()) {
      await setTiltEnabled(true)
    }
    startFlight()
  }

  const onFly = async () => {
    await prepareFlight()
  }

  const onCreateRoom = async () => {
    setNetBusy(true)
    setRoomMeta({ roomStatus: 'Creating room…', peerConnected: false })
    try {
      const code = makeRoomCode()
      const session = await hostRoom(code, {
        onPeerJoined: () => {
          setRoomMeta({ peerConnected: true, roomStatus: 'Friend connected — ready to fly' })
          sendHello()
        },
        onMessage: handleNetMessage,
        onDisconnected: () => {
          setRoomMeta({ peerConnected: false, roomStatus: 'Friend left' })
          useGameStore.getState().setRemoteFlight(null)
        },
        onError: (err) => {
          setRoomMeta({ roomStatus: err.message || 'Room error' })
        },
      })
      setRoomSession(session)
      setRoomMeta({
        roomCode: code,
        roomRole: 'host',
        roomStatus: `Room ${code} — share this code, then Fly`,
      })
    } catch (e) {
      setRoomMeta({
        roomStatus: e instanceof Error ? e.message : 'Could not create room',
        roomRole: 'solo',
        roomCode: null,
      })
      setRoomSession(null)
    } finally {
      setNetBusy(false)
    }
  }

  const onJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setRoomMeta({ roomStatus: 'Enter a 4-character room code' })
      return
    }
    setNetBusy(true)
    setRoomMeta({ roomStatus: `Joining ${code}…` })
    try {
      const session = await joinRoom(code, {
        onMessage: handleNetMessage,
        onDisconnected: () => {
          setRoomMeta({ peerConnected: false, roomStatus: 'Disconnected from host' })
          useGameStore.getState().setRemoteFlight(null)
        },
        onError: (err) => {
          setRoomMeta({ roomStatus: err.message || 'Join error' })
        },
      })
      setRoomSession(session)
      setRoomMeta({
        roomCode: code,
        roomRole: 'guest',
        peerConnected: true,
        roomStatus: `Joined ${code} — fly together`,
      })
      sendHello()
      await prepareFlight()
    } catch (e) {
      setRoomMeta({
        roomStatus: e instanceof Error ? e.message : 'Could not join room',
        roomRole: 'solo',
        roomCode: null,
        peerConnected: false,
      })
      setRoomSession(null)
    } finally {
      setNetBusy(false)
    }
  }

  return (
    <div className={styles.home}>
      <div className={styles.heroBg} aria-hidden />
      <div className={styles.heroContent}>
        <h1 className={styles.brand}>HangGlider</h1>
        <p className={styles.tagline}>Feel the lift</p>

        <div className={styles.pickerSection}>
          <span className={styles.sectionLabel}>Pilot name</span>
          <input
            className={styles.roomInput}
            value={playerName}
            maxLength={16}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Pilot"
          />
        </div>

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

        <div className={styles.pickerSection}>
          <span className={styles.sectionLabel}>2-player room</span>
          <div className={styles.roomRow}>
            <button
              type="button"
              className={styles.roomBtn}
              onClick={onCreateRoom}
              disabled={netBusy}
            >
              Create room
            </button>
            <input
              className={styles.roomInput}
              value={joinCode}
              maxLength={4}
              placeholder="CODE"
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              type="button"
              className={styles.roomBtn}
              onClick={onJoinRoom}
              disabled={netBusy}
            >
              Join
            </button>
          </div>
          {(roomStatus || roomCode) && (
            <p className={styles.roomStatus}>
              {roomCode && roomRole === 'host' && !peerConnected
                ? `Code ${roomCode} — waiting for friend…`
                : roomStatus}
              {peerConnected ? ' · Linked' : ''}
            </p>
          )}
        </div>

        <button type="button" className={styles.flyBtn} onClick={onFly} disabled={netBusy}>
          {roomRole === 'host' && !peerConnected ? 'Fly solo / wait' : 'Fly'}
        </button>
        <p className={styles.controlsHint}>
          {tiltEnabled
            ? 'Hold landscape like a wheel — turn to bank · pull/push to pitch · Level to recalibrate'
            : 'Takeoff: Shift + ↓ climb · Jump at 25m · Create a room to fly with a friend'}
        </p>
      </div>
    </div>
  )
}
