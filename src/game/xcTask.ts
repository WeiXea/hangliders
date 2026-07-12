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
