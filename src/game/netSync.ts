import type { NetMsg, RoomSession } from './netRoom'
import { useGameStore } from './gameStore'

let session: RoomSession | null = null
let syncAcc = 0

export function getRoomSession() {
  return session
}

export function setRoomSession(s: RoomSession | null) {
  session?.destroy()
  session = s
  // Help heartbeat include the local name
  ;(window as unknown as { __hgName?: string }).__hgName =
    useGameStore.getState().playerName
}

export function handleNetMessage(msg: NetMsg) {
  const store = useGameStore.getState()
  if (msg.t === 'hello' || msg.t === 'ready') {
    if (msg.t === 'hello') {
      store.applyRemoteHello(msg.biome, msg.mode, msg.name)
    } else {
      store.setRoomMeta({
        peerConnected: true,
        remoteName: msg.name,
        roomStatus: `${msg.name} is ready`,
      })
    }
  } else if (msg.t === 'state') {
    store.setRemoteFlight(msg.flight, msg.name)
  } else if (msg.t === 'ping') {
    if (!store.peerConnected) {
      store.setRoomMeta({
        peerConnected: true,
        remoteName: msg.name,
        roomStatus: `Linked with ${msg.name}`,
      })
    }
  }
}

export function tickNetSync(dt: number) {
  if (!session) return
  const { flight, playerName, peerConnected, roomRole, screen } = useGameStore.getState()
  if (roomRole === 'solo') return
  if (screen !== 'flight' && screen !== 'result') return
  if (!peerConnected && !session.connected) return

  syncAcc += dt
  if (syncAcc < 0.12) return
  syncAcc = 0
  session.send({ t: 'state', flight, name: playerName })
}

export function sendHello() {
  if (!session) return
  const { biome, mode, playerName } = useGameStore.getState()
  ;(window as unknown as { __hgName?: string }).__hgName = playerName
  session.send({ t: 'hello', biome, mode, name: playerName })
  session.send({ t: 'ready', name: playerName })
}
