import { joinRoom as trysteroJoin } from '@trystero-p2p/torrent'
import type { Room } from '@trystero-p2p/core'
import type { Biome, FlightState, GameMode } from '../types/game'

const APP_ID = 'hangglider-sky-duo-v2'

const TURN_CONFIG = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export type NetMsg =
  | { t: 'hello'; biome: Biome; mode: GameMode; name: string }
  | { t: 'state'; flight: FlightState; name: string }
  | { t: 'ping'; name: string }
  | { t: 'ready'; name: string }

export function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export interface RoomSession {
  room: Room
  code: string
  role: 'host' | 'guest'
  connected: boolean
  peerCount: number
  send: (msg: NetMsg) => void
  destroy: () => void
}

type Handlers = {
  onPeerJoined?: () => void
  onMessage: (msg: NetMsg) => void
  onDisconnected?: () => void
}

/**
 * Enter a shared room immediately. Does NOT wait for the other player —
 * the UI stays in a lobby until onPeerJoined / first message fires.
 */
export function enterRoom(
  code: string,
  role: 'host' | 'guest',
  handlers: Handlers,
): RoomSession {
  const roomId = code.trim().toUpperCase()
  if (roomId.length < 4) {
    throw new Error('Enter a 4-character room code')
  }

  const room = trysteroJoin(
    {
      appId: APP_ID,
      turnConfig: TURN_CONFIG,
    },
    `hangglider-${roomId}`,
  )

  const action = room.makeAction('hg')

  const markJoined = () => {
    if (session.connected) return
    session.connected = true
    session.peerCount = Math.max(1, session.peerCount)
    handlers.onPeerJoined?.()
  }

  action.onMessage = (data) => {
    if (!data || typeof data !== 'object' || !('t' in data)) return
    const msg = data as NetMsg
    // Any traffic means the peer link is alive (onPeerJoin can be flaky)
    markJoined()
    handlers.onMessage(msg)
  }

  const session: RoomSession = {
    room,
    code: roomId,
    role,
    connected: false,
    peerCount: 0,
    send: (msg) => {
      try {
        action.send(JSON.parse(JSON.stringify(msg)))
      } catch {
        /* no peers yet */
      }
    },
    destroy: () => {
      window.clearInterval(heartbeat)
      try {
        room.leave()
      } catch {
        /* already left */
      }
    },
  }

  room.onPeerJoin = () => {
    session.peerCount += 1
    markJoined()
  }

  room.onPeerLeave = () => {
    session.peerCount = Math.max(0, session.peerCount - 1)
    if (session.peerCount === 0) {
      session.connected = false
      handlers.onDisconnected?.()
    }
  }

  // Keep announcing so late joiners still find us
  const heartbeat = window.setInterval(() => {
    try {
      const name = (window as unknown as { __hgName?: string }).__hgName ?? 'Pilot'
      action.send(JSON.parse(JSON.stringify({ t: 'ping', name })))
    } catch {
      /* ignore */
    }
  }, 2000)

  return session
}
