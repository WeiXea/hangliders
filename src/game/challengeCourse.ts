import type { Biome, ChallengeRing } from '../types/game'
import { BIOME_CONFIGS } from './biomeConfigs'
import { getThermals } from './atmosphere'

/** Place challenge rings through thermal cores so lift matters on the course. */
export function buildChallengeRings(biome: Biome): ChallengeRing[] {
  const config = BIOME_CONFIGS[biome]
  const launch = config.launchPosition
  const thermals = [...getThermals(biome)].sort((a, b) => {
    const da = Math.hypot(a.x - launch.x, a.z - launch.z)
    const db = Math.hypot(b.x - launch.x, b.z - launch.z)
    return da - db
  })

  const fallback = config.challengeRings
  if (fallback.length === 0) return []
  const count = Math.max(4, Math.min(5, Math.max(thermals.length, fallback.length)))
  const rings: ChallengeRing[] = []

  for (let i = 0; i < count; i++) {
    const th = thermals[i]
    const fb = fallback[Math.min(i, fallback.length - 1)]
    let x: number
    let z: number
    let yHint: number
    if (th) {
      // Slight offset so the ring sits in the climb path, not dead-center dead air
      const ang = Math.atan2(th.x - launch.x, th.z - launch.z)
      x = th.x - Math.sin(ang) * th.radius * 0.15
      z = th.z - Math.cos(ang) * th.radius * 0.15
      yHint = (th.y0 + th.y1) * 0.42
    } else {
      x = fb.x
      z = fb.z
      yHint = fb.y
    }
    const ground = config.getHeight(x, z)
    const airHeight = Math.max(yHint, ground + 24, (th?.y0 ?? 20) + 8)
    rings.push({
      id: i,
      position: { x, y: Math.min(airHeight, ground + 90), z },
      radius: 12,
      passed: false,
    })
  }

  return rings
}
