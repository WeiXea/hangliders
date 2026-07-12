import type { Biome, Vec3 } from '../types/game'
import { BIOME_CONFIGS } from './biomeConfigs'
import { getThermals } from './atmosphere'

export type XCTurnpoint = {
  id: number
  name: string
  position: Vec3
  radius: number
  /** Minimum AGL to tag (encourages using lift) */
  minAlt: number
  tagged: boolean
}

export type XCTask = {
  turnpoints: XCTurnpoint[]
  goal: { position: Vec3; radius: number }
  startTime: number | null
  finishTime: number | null
  nextIndex: number
  completed: boolean
}

const TP_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']

/** Build a cross-country task through thermals ending at the biome landing zone. */
export function buildXCTask(biome: Biome): XCTask {
  const config = BIOME_CONFIGS[biome]
  const launch = config.launchPosition
  const thermals = [...getThermals(biome)].sort((a, b) => {
    const da = Math.hypot(a.x - launch.x, a.z - launch.z)
    const db = Math.hypot(b.x - launch.x, b.z - launch.z)
    return da - db
  })

  const count = Math.min(4, Math.max(3, thermals.length))
  const turnpoints: XCTurnpoint[] = []
  for (let i = 0; i < count; i++) {
    const th = thermals[i]
    const fb = config.challengeRings[Math.min(i, config.challengeRings.length - 1)]
    const x = th?.x ?? fb.x
    const z = th?.z ?? fb.z
    const ground = config.getHeight(x, z)
    const y = Math.max(ground + 28, th ? (th.y0 + th.y1) * 0.4 : fb.y)
    turnpoints.push({
      id: i,
      name: TP_NAMES[i] ?? `TP${i + 1}`,
      position: { x, y, z },
      radius: 28,
      minAlt: 18,
      tagged: false,
    })
  }

  const goal = {
    position: {
      x: config.landingZone.center.x,
      y: config.getHeight(config.landingZone.center.x, config.landingZone.center.z) + 2,
      z: config.landingZone.center.z,
    },
    radius: config.landingZone.radius * 1.2,
  }

  return {
    turnpoints,
    goal,
    startTime: null,
    finishTime: null,
    nextIndex: 0,
    completed: false,
  }
}

export function xcProgressLabel(task: XCTask): string {
  if (task.completed) return 'Goal!'
  if (task.nextIndex >= task.turnpoints.length) return 'To goal'
  const tp = task.turnpoints[task.nextIndex]
  return `${tp.name} · ${task.nextIndex + 1}/${task.turnpoints.length}`
}

/** Next navigation target for compass / distance. */
export function xcNavTarget(task: XCTask): { x: number; y: number; z: number; label: string } | null {
  if (task.completed) return null
  if (task.nextIndex >= task.turnpoints.length) {
    return { ...task.goal.position, label: 'Goal' }
  }
  const tp = task.turnpoints[task.nextIndex]
  return { ...tp.position, label: tp.name }
}

export function xcElapsedMs(task: XCTask, now = Date.now()): number | null {
  if (task.startTime == null) return null
  const end = task.finishTime ?? now
  return Math.max(0, end - task.startTime)
}

export function formatXCTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Bearing from yaw to target, relative (−π..π, + = right). */
export function xcRelBearing(
  yaw: number,
  from: { x: number; z: number },
  to: { x: number; z: number },
): number {
  const abs = Math.atan2(to.x - from.x, to.z - from.z)
  let rel = abs - yaw
  while (rel > Math.PI) rel -= Math.PI * 2
  while (rel < -Math.PI) rel += Math.PI * 2
  return rel
}
