import type { NetMsg, RoomSession } from './netRoom'
import { useGameStore } from './gameStore'
import { noteRemoteFlight } from './remoteSmooth'

let session: RoomSession | null = null
let syncAcc = 0

export function getRoomSession() {
  return session
}

export function setRoomSession(s: RoomSession | null) {
  session?.destroy()
  session = s
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
    noteRemoteFlight(msg.flight)
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

  // Faster updates while tandem so the passenger stays smooth
  const interval = flight.tandemRole !== 'none' ? 0.05 : 0.1
  syncAcc += dt
  if (syncAcc < interval) return
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
