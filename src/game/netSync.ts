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
}

export function handleNetMessage(msg: NetMsg) {
  const store = useGameStore.getState()
  if (msg.t === 'hello') {
    store.applyRemoteHello(msg.biome, msg.mode, msg.name)
  } else if (msg.t === 'state') {
    store.setRemoteFlight(msg.flight, msg.name)
  }
}

export function tickNetSync(dt: number) {
  if (!session?.conn?.open) return
  syncAcc += dt
  if (syncAcc < 0.12) return
  syncAcc = 0
  const { flight, playerName } = useGameStore.getState()
  session.send({ t: 'state', flight, name: playerName })
}

export function sendHello() {
  if (!session) return
  const { biome, mode, playerName } = useGameStore.getState()
  session.send({ t: 'hello', biome, mode, name: playerName })
}
