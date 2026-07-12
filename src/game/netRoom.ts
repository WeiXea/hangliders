import mqtt, { type MqttClient } from 'mqtt'
import type { Biome, FlightState, GameMode } from '../types/game'

/** Bump when changing room wire format so old clients don't clash. */
const ROOM_NS = 'hangglider/v4'

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
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
  code: string
  role: 'host' | 'guest'
  connected: boolean
  peerCount: number
  send: (msg: NetMsg) => void
  destroy: () => void
}

type Handlers = {
  onPeerJoined?: (peerName?: string) => void
  onMessage: (msg: NetMsg) => void
  onDisconnected?: () => void
  onStatus?: (status: string) => void
}

function selfId(): string {
  const key = 'hg-peer-id'
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = Math.random().toString(36).slice(2, 10)
    localStorage.setItem(key, id)
    return id
  } catch {
    return Math.random().toString(36).slice(2, 10)
  }
}

/**
 * Shared room over public MQTT (no WebRTC). Presence is retained per peer so
 * whoever joins second immediately sees the first — works across Wi‑Fi/cellular.
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

  const myId = selfId()
  const presenceMine = `${ROOM_NS}/${roomId}/presence/${myId}`
  const presenceAll = `${ROOM_NS}/${roomId}/presence/#`
  const msgTopic = `${ROOM_NS}/${roomId}/msg`
  const seenPeers = new Set<string>()
  let client: MqttClient | null = null
  let destroyed = false
  let brokerIndex = 0
  let heartbeat: number | undefined

  const session: RoomSession = {
    code: roomId,
    role,
    connected: false,
    peerCount: 0,
    send: (msg) => {
      if (!client?.connected) return
      try {
        client.publish(
          msgTopic,
          JSON.stringify({ from: myId, ...msg }),
          { qos: 0, retain: false },
        )
      } catch {
        /* ignore */
      }
    },
    destroy: () => {
      destroyed = true
      window.clearInterval(heartbeat)
      try {
        // Clear retained presence so we don't look "still here"
        client?.publish(presenceMine, '', { qos: 0, retain: true })
        client?.end(true)
      } catch {
        /* already left */
      }
      client = null
    },
  }

  const markJoined = (peerName?: string) => {
    if (session.connected) return
    session.connected = true
    session.peerCount = Math.max(1, seenPeers.size)
    handlers.onPeerJoined?.(peerName)
  }

  const publishPresence = () => {
    if (!client?.connected || destroyed) return
    const name = (window as unknown as { __hgName?: string }).__hgName ?? 'Pilot'
    client.publish(
      presenceMine,
      JSON.stringify({ id: myId, name, at: Date.now() }),
      { qos: 0, retain: true },
    )
  }

  const connectBroker = (url: string) => {
    handlers.onStatus?.('Connecting to lobby…')
    const c = mqtt.connect(url, {
      clientId: `hg-${myId}-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 10_000,
      reconnectPeriod: 3_000,
      protocolVersion: 4,
    })
    client = c

    c.on('connect', () => {
      if (destroyed) {
        c.end(true)
        return
      }
      handlers.onStatus?.(
        role === 'host'
          ? 'In lobby — share your code and wait…'
          : 'In lobby — looking for host…',
      )
      c.subscribe([presenceAll, msgTopic], { qos: 0 }, (err) => {
        if (err) {
          handlers.onStatus?.('Could not enter lobby — retrying…')
          return
        }
        publishPresence()
      })
    })

    c.on('message', (topic, payload) => {
      if (destroyed) return

      if (topic.startsWith(`${ROOM_NS}/${roomId}/presence/`)) {
        const peerKey = topic.split('/').pop() ?? ''
        if (!peerKey || peerKey === myId) return

        // Empty retain clear = peer left
        if (!payload.length) {
          seenPeers.delete(peerKey)
          session.peerCount = seenPeers.size
          if (seenPeers.size === 0 && session.connected) {
            session.connected = false
            handlers.onDisconnected?.()
          }
          return
        }

        let data: { id?: string; name?: string }
        try {
          data = JSON.parse(payload.toString()) as { id?: string; name?: string }
        } catch {
          return
        }
        const wasNew = !seenPeers.has(peerKey)
        seenPeers.add(peerKey)
        session.peerCount = seenPeers.size
        if (wasNew) {
          markJoined(data.name || 'Friend')
          publishPresence()
          const n = (window as unknown as { __hgName?: string }).__hgName ?? 'Pilot'
          session.send({ t: 'ping', name: n })
        }
        return
      }

      if (topic === msgTopic) {
        let data: Record<string, unknown>
        try {
          data = JSON.parse(payload.toString()) as Record<string, unknown>
        } catch {
          return
        }
        const from = typeof data.from === 'string' ? data.from : ''
        if (from === myId) return
        if (from) {
          seenPeers.add(from)
          session.peerCount = seenPeers.size
          markJoined(typeof data.name === 'string' ? data.name : undefined)
        }
        if (!data.t || typeof data.t !== 'string') return
        const { from: _f, ...rest } = data
        handlers.onMessage(rest as unknown as NetMsg)
      }
    })

    c.on('close', () => {
      if (destroyed) return
      if (!session.connected && brokerIndex < BROKERS.length - 1) {
        brokerIndex += 1
        try {
          c.end(true)
        } catch {
          /* */
        }
        connectBroker(BROKERS[brokerIndex]!)
      }
    })
  }

  connectBroker(BROKERS[0]!)

  heartbeat = window.setInterval(() => {
    publishPresence()
  }, 2500)

  return session
}
