/** Parked skateboards on the Skate Path — board / hide / leave like city cars. */

export type ParkedSkateboard = {
  id: number
  x: number
  z: number
  yaw: number
  color: string
}

const DEFAULT_BOARDS: ParkedSkateboard[] = [
  { id: 0, x: 1.8, z: 8, yaw: 0, color: '#2a4a6a' },
  { id: 1, x: -2.2, z: 16, yaw: 0.08, color: '#6a2a3a' },
  { id: 2, x: 2.4, z: 140, yaw: 0, color: '#2a5a4a' },
  { id: 3, x: -1.6, z: 260, yaw: -0.05, color: '#3a3a6a' },
  { id: 4, x: 0.5, z: 380, yaw: 0, color: '#5a3a2a' },
]

let boards: ParkedSkateboard[] = DEFAULT_BOARDS.map((b) => ({ ...b }))
let takenId = -1

export function resetSkateboards() {
  boards = DEFAULT_BOARDS.map((b) => ({ ...b }))
  takenId = -1
}

export function getParkedSkateboards(): ParkedSkateboard[] {
  return boards
}

export function getTakenSkateboardId() {
  return takenId
}

export function setTakenSkateboardId(id: number) {
  takenId = id
}

export function skateboardColor(id: number): string | undefined {
  return boards.find((b) => b.id === id)?.color
}

export function nearestSkateboard(
  x: number,
  z: number,
  range = 5.5,
): ParkedSkateboard | null {
  let best: ParkedSkateboard | null = null
  let bestD = range
  for (const b of boards) {
    if (b.id === takenId) continue
    const d = Math.hypot(b.x - x, b.z - z)
    if (d < bestD) {
      bestD = d
      best = b
    }
  }
  return best
}

export function leaveSkateboardInWorld(id: number, x: number, z: number, yaw: number) {
  const i = boards.findIndex((b) => b.id === id)
  if (i >= 0) {
    boards[i] = { ...boards[i], x, z, yaw }
  } else {
    boards.push({
      id,
      x,
      z,
      yaw,
      color: DEFAULT_BOARDS.find((b) => b.id === id)?.color ?? '#2a4a6a',
    })
  }
  takenId = -1
}
