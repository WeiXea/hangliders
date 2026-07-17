import { useEffect, useState } from 'react'
import { useGameStore } from '../game/gameStore'
import { BIOME_CONFIGS } from '../game/biomeConfigs'
import { readStoredTiltPreference } from '../game/tilt'
import { enterRoom, makeRoomCode } from '../game/netRoom'
import { handleNetMessage, sendHello, setRoomSession } from '../game/netSync'
import type { Biome, GameMode } from '../types/game'
import styles from './HomeScreen.module.css'

const BIOMES: Biome[] = ['tankfarm', 'city', 'beach', 'mountains']

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
  const remoteName = useGameStore((s) => s.remoteName)
  const setRoomMeta = useGameStore((s) => s.setRoomMeta)
  const [tiltBusy, setTiltBusy] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [netBusy, setNetBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const inLobby = roomRole === 'host' || roomRole === 'guest'

  // Auto-join from ?room=CODE share link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('room')?.trim().toUpperCase()
    if (fromUrl && fromUrl.length >= 4 && roomRole === 'solo') {
      setJoinCode(fromUrl)
    }
  }, [roomRole])

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

  const wireHandlers = (role: 'host' | 'guest') => ({
    onPeerJoined: (peerName?: string) => {
      const other = peerName || useGameStore.getState().remoteName || 'Friend'
      setRoomMeta({
        peerConnected: true,
        remoteName: other,
        roomStatus:
          role === 'host'
            ? `${other} joined — press Fly together`
            : `Found ${other} — press Fly together`,
      })
      window.setTimeout(() => sendHello(), 150)
    },
    onMessage: handleNetMessage,
    onStatus: (status: string) => {
      if (!useGameStore.getState().peerConnected) {
        setRoomMeta({ roomStatus: status })
      }
    },
    onDisconnected: () => {
      setRoomMeta({
        peerConnected: false,
        roomStatus: 'Friend left — waiting again…',
      })
      useGameStore.getState().setRemoteFlight(null)
    },
  })

  const leaveLobby = () => {
    setRoomSession(null)
    setRoomMeta({
      roomCode: null,
      roomRole: 'solo',
      roomStatus: '',
      peerConnected: false,
    })
    useGameStore.getState().setRemoteFlight(null)
    // Clear ?room= from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.pathname)
  }

  const onCreateRoom = () => {
    setNetBusy(true)
    try {
      setRoomSession(null)
      const code = makeRoomCode()
      const session = enterRoom(code, 'host', wireHandlers('host'))
      setRoomSession(session)
      setRoomMeta({
        roomCode: code,
        roomRole: 'host',
        peerConnected: false,
        roomStatus: 'Waiting for your friend to join…',
      })
      const url = new URL(window.location.href)
      url.searchParams.set('room', code)
      window.history.replaceState({}, '', url.toString())
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

  const onJoinRoom = () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setRoomMeta({ roomStatus: 'Enter the 4-letter code from your friend' })
      return
    }
    setNetBusy(true)
    try {
      setRoomSession(null)
      const session = enterRoom(code, 'guest', wireHandlers('guest'))
      setRoomSession(session)
      setRoomMeta({
        roomCode: code,
        roomRole: 'guest',
        peerConnected: false,
        roomStatus: 'In lobby — waiting to find your friend…',
      })
      const url = new URL(window.location.href)
      url.searchParams.set('room', code)
      window.history.replaceState({}, '', url.toString())
      // Announce right away; host may already be listening
      window.setTimeout(() => sendHello(), 400)
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

  const onCopy = async () => {
    if (!roomCode) return
    const share = `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    try {
      await navigator.clipboard.writeText(share)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      try {
        await navigator.clipboard.writeText(roomCode)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        /* ignore */
      }
    }
  }

  const onFlyTogether = async () => {
    sendHello()
    await prepareFlight()
  }

  return (
    <div className={styles.home}>
      <div className={styles.heroBg} aria-hidden />
      <div className={styles.heroContent}>
        <h1 className={styles.brand}>HangGlider</h1>
        <p className={styles.tagline}>Feel the lift</p>

        {!inLobby && (
          <>
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
                  if (!cfg) return null
                  return (
                    <button
                      key={b}
                      type="button"
                      className={`${styles.biomeBtn} ${biome === b ? styles.biomeActive : ''} ${b === 'tankfarm' ? styles.biomeNew : ''}`}
                      onClick={() => setBiome(b)}
                    >
                      <span className={styles.biomeName}>
                        {cfg.name}
                        {b === 'tankfarm' ? ' · NEW' : ''}
                      </span>
                      <span className={styles.biomeTag}>{cfg.tagline}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={styles.pickerSection}>
              <span className={styles.sectionLabel}>Mode</span>
              <div className={styles.modePicker}>
                {(['free', 'challenge', 'xc'] as GameMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`${styles.modeBtn} ${mode === m ? styles.modeActive : ''}`}
                    onClick={() => setMode(m)}
                  >
                    {m === 'free' ? 'Free Flight' : m === 'challenge' ? 'Challenge' : 'XC Task'}
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
              <span className={styles.sectionLabel}>Fly with a friend</span>
              <div className={styles.roomRow}>
                <button
                  type="button"
                  className={styles.roomBtn}
                  onClick={onCreateRoom}
                  disabled={netBusy}
                >
                  Host room
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
              <p className={styles.roomHint}>
                One person hosts and shares the code (or link). The other joins — then both press Fly together.
              </p>
            </div>

            <button type="button" className={styles.flyBtn} onClick={prepareFlight} disabled={netBusy}>
              Fly solo
            </button>
            {biome === 'city' && (
              <p className={styles.cityExploreHint}>
                <b>Urban Skyline</b> (selected) — Kenney cars, roads, and buildings. Free Flight starts
                downtown. Hard-refresh if you still see the old boxy city.
              </p>
            )}
            {biome === 'tankfarm' && (
              <p className={styles.cityExploreHint}>
                <b>Tank Farm</b> — Step 1: Poly Haven HDRI sky + industrial yard. More tanks/props next.
              </p>
            )}
          </>
        )}

        {inLobby && (
          <div className={styles.lobby}>
            <span className={styles.sectionLabel}>
              {roomRole === 'host' ? 'You are hosting' : 'You joined a room'}
            </span>
            <div className={styles.lobbyCode}>{roomCode}</div>
            {roomRole === 'host' && (
              <button type="button" className={styles.roomBtn} onClick={onCopy}>
                {copied ? 'Copied link!' : 'Copy invite link'}
              </button>
            )}
            <p className={`${styles.lobbyStatus} ${peerConnected ? styles.lobbyReady : styles.lobbyWait}`}>
              {peerConnected
                ? `Ready with ${remoteName || 'friend'}`
                : roomStatus || 'Waiting…'}
            </p>
            {!peerConnected && (
              <p className={styles.roomHint}>
                {roomRole === 'host'
                  ? 'Keep this page open. Friend taps Join with your code (or opens your invite link).'
                  : 'Keep this page open. Host must stay on their lobby with the same code.'}
              </p>
            )}
            <button
              type="button"
              className={styles.flyBtn}
              onClick={onFlyTogether}
              disabled={netBusy}
            >
              {peerConnected ? 'Fly together' : 'Fly anyway'}
            </button>
            <button type="button" className={styles.leaveLobby} onClick={leaveLobby}>
              Leave lobby
            </button>
          </div>
        )}

        <p className={styles.controlsHint}>
          {tiltEnabled
            ? 'Hold landscape like a wheel — turn to bank · pull/push to pitch · green columns = lift'
            : 'Speed (Shift) → Climb (↓) → green thermals → Land (L) or End flight'}
        </p>
      </div>
    </div>
  )
}
