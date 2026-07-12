import Peer, { type DataConnection } from 'peerjs'
import type { Biome, FlightState, GameMode } from '../types/game'

const PREFIX = 'hangglider-room-'

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

function peerIdForCode(code: string) {
  return PREFIX + code.trim().toUpperCase()
}

function waitPeerOpen(peer: Peer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!peer.destroyed && peer.open) {
      resolve()
      return
    }
    const onOpen = () => {
      cleanup()
      resolve()
    }
    const onErr = (err: Error) => {
      cleanup()
      reject(err)
    }
    const cleanup = () => {
      peer.off('open', onOpen)
      peer.off('error', onErr)
    }
    peer.on('open', onOpen)
    peer.on('error', onErr)
  })
}

function waitConnOpen(conn: DataConnection): Promise<void> {
  return new Promise((resolve, reject) => {
    if (conn.open) {
      resolve()
      return
    }
    const t = window.setTimeout(() => reject(new Error('Connection timed out')), 12000)
    conn.on('open', () => {
      window.clearTimeout(t)
      resolve()
    })
    conn.on('error', (err) => {
      window.clearTimeout(t)
      reject(err)
    })
  })
}

export interface RoomSession {
  peer: Peer
  conn: DataConnection | null
  code: string
  role: 'host' | 'guest'
  send: (msg: NetMsg) => void
  destroy: () => void
}

type Handlers = {
  onPeerJoined?: () => void
  onMessage: (msg: NetMsg) => void
  onDisconnected?: () => void
  onError?: (err: Error) => void
}

export async function hostRoom(code: string, handlers: Handlers): Promise<RoomSession> {
  const peer = new Peer(peerIdForCode(code), {
    debug: 0,
  })
  try {
    await waitPeerOpen(peer)
  } catch (e) {
    peer.destroy()
    throw e
  }

  let conn: DataConnection | null = null
  const session: RoomSession = {
    peer,
    conn: null,
    code: code.toUpperCase(),
    role: 'host',
    send: (msg) => {
      if (conn?.open) conn.send(msg)
    },
    destroy: () => {
      conn?.close()
      peer.destroy()
    },
  }

  peer.on('connection', (c) => {
    if (conn && conn.open) {
      c.close()
      return
    }
    conn = c
    session.conn = c
    c.on('data', (raw) => {
      handlers.onMessage(raw as NetMsg)
    })
    c.on('close', () => {
      conn = null
      session.conn = null
      handlers.onDisconnected?.()
    })
    c.on('open', () => {
      handlers.onPeerJoined?.()
    })
  })

  peer.on('error', (err) => {
    handlers.onError?.(err instanceof Error ? err : new Error(String(err)))
  })

  return session
}

export async function joinRoom(code: string, handlers: Handlers): Promise<RoomSession> {
  const peer = new Peer({ debug: 0 })
  try {
    await waitPeerOpen(peer)
  } catch (e) {
    peer.destroy()
    throw e
  }

  const conn = peer.connect(peerIdForCode(code), { reliable: true })
  try {
    await waitConnOpen(conn)
  } catch (e) {
    peer.destroy()
    throw e
  }

  conn.on('data', (raw) => {
    handlers.onMessage(raw as NetMsg)
  })
  conn.on('close', () => {
    handlers.onDisconnected?.()
  })
  peer.on('error', (err) => {
    handlers.onError?.(err instanceof Error ? err : new Error(String(err)))
  })

  return {
    peer,
    conn,
    code: code.toUpperCase(),
    role: 'guest',
    send: (msg) => {
      if (conn.open) conn.send(msg)
    },
    destroy: () => {
      conn.close()
      peer.destroy()
    },
  }
}
