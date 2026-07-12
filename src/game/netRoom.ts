import { joinRoom as trysteroJoin } from '@trystero-p2p/mqtt'
import type { Room } from '@trystero-p2p/core'
import type { Biome, FlightState, GameMode } from '../types/game'

const APP_ID = 'hangglider-pwa-v1'

/** Public STUN + Open Relay TURN so peers behind NATs can still connect */
const TURN_CONFIG = [
  {
    urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'],
  },
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
  | { t: 'ping' }

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
 * Host and guest both call enterRoom with the same code.
 * MQTT signaling + TURN — more reliable than PeerJS fixed IDs.
 */
export async function enterRoom(
  code: string,
  role: 'host' | 'guest',
  handlers: Handlers,
): Promise<RoomSession> {
  const roomId = code.trim().toUpperCase()
  if (roomId.length < 4) {
    throw new Error('Enter a 4-character room code')
  }

  const room = trysteroJoin(
    {
      appId: APP_ID,
      turnConfig: TURN_CONFIG,
    },
    `hg-${roomId}`,
  )

  const action = room.makeAction('hg')
  action.onMessage = (data) => {
    if (data && typeof data === 'object' && data !== null && 't' in data) {
      handlers.onMessage(data as NetMsg)
    }
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
      try {
        room.leave()
      } catch {
        /* already left */
      }
    },
  }

  let resolvePeer: (() => void) | null = null
  const peerPromise =
    role === 'guest'
      ? new Promise<void>((resolve, reject) => {
          resolvePeer = resolve
          window.setTimeout(() => {
            if (!session.connected) {
              reject(
                new Error(
                  'Nobody in that room — friend must Create room and stay on the home screen, then you Join',
                ),
              )
            }
          }, 20000)
        })
      : Promise.resolve()

  room.onPeerJoin = () => {
    session.peerCount += 1
    session.connected = true
    handlers.onPeerJoined?.()
    resolvePeer?.()
    resolvePeer = null
  }

  room.onPeerLeave = () => {
    session.peerCount = Math.max(0, session.peerCount - 1)
    if (session.peerCount === 0) {
      session.connected = false
      handlers.onDisconnected?.()
    }
  }

  if (role === 'guest') {
    await peerPromise
  }

  return session
}

export async function hostRoom(code: string, handlers: Handlers) {
  return enterRoom(code, 'host', handlers)
}

export async function joinRoom(code: string, handlers: Handlers) {
  return enterRoom(code, 'guest', handlers)
}
