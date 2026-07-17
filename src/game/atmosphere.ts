import type { BiomeConfig, Vec3 } from '../types/game'

export type Thermal = {
  x: number
  z: number
  radius: number
  strength: number
  /** Vertical core height band */
  y0: number
  y1: number
}

export type ThermalSample = {
  cx: number
  cz: number
  radius: number
  strength: number
  y0: number
  y1: number
}

/** Deterministic thermal field per biome (world-space bubbles). */
export function getThermals(biomeId: string): Thermal[] {
  if (biomeId === 'mountains') {
    return [
      { x: 40, z: 60, radius: 38, strength: 4.2, y0: 20, y1: 160 },
      { x: 120, z: 140, radius: 45, strength: 5.0, y0: 25, y1: 180 },
      { x: 200, z: 90, radius: 32, strength: 3.6, y0: 15, y1: 140 },
      { x: 90, z: 220, radius: 50, strength: 4.8, y0: 30, y1: 170 },
      { x: 250, z: 200, radius: 40, strength: 3.8, y0: 20, y1: 150 },
      { x: -20, z: 100, radius: 28, strength: 3.2, y0: 15, y1: 120 },
      { x: 320, z: 280, radius: 42, strength: 4.0, y0: 22, y1: 165 },
      { x: 180, z: 320, radius: 36, strength: 3.5, y0: 18, y1: 145 },
    ]
  }
  if (biomeId === 'city') {
    return [
      { x: 80, z: 100, radius: 32, strength: 3.0, y0: 15, y1: 100 },
      { x: 160, z: 160, radius: 36, strength: 3.4, y0: 18, y1: 110 },
      { x: 40, z: 200, radius: 30, strength: 2.8, y0: 12, y1: 95 },
      { x: 120, z: 70, radius: 28, strength: 2.6, y0: 14, y1: 90 },
      { x: 220, z: 220, radius: 34, strength: 3.1, y0: 16, y1: 105 },
      { x: 280, z: 140, radius: 30, strength: 2.7, y0: 14, y1: 98 },
    ]
  }
  if (biomeId === 'tankfarm') {
    return [
      { x: 70, z: 90, radius: 34, strength: 3.4, y0: 14, y1: 120 },
      { x: 150, z: 130, radius: 40, strength: 3.8, y0: 16, y1: 130 },
      { x: 40, z: 180, radius: 30, strength: 3.0, y0: 12, y1: 110 },
      { x: 190, z: 70, radius: 32, strength: 3.2, y0: 14, y1: 115 },
      { x: 110, z: 210, radius: 36, strength: 3.5, y0: 15, y1: 125 },
    ]
  }
  // beach — coastal thermals off cliffs/dunes
  return [
    { x: 20, z: 50, radius: 34, strength: 3.2, y0: 12, y1: 105 },
    { x: 100, z: 120, radius: 42, strength: 3.6, y0: 15, y1: 120 },
    { x: 180, z: 80, radius: 30, strength: 2.8, y0: 10, y1: 100 },
    { x: 140, z: 200, radius: 38, strength: 3.4, y0: 14, y1: 110 },
    { x: 60, z: 160, radius: 28, strength: 2.6, y0: 12, y1: 95 },
    { x: 260, z: 180, radius: 36, strength: 3.2, y0: 14, y1: 115 },
    { x: 200, z: 280, radius: 40, strength: 3.0, y0: 12, y1: 108 },
  ]
}

/** Live world center of a thermal (matches sampleAtmosphere drift). */
export function thermalCenter(th: Thermal, time: number): { cx: number; cz: number } {
  const drift = time * 1.8
  return {
    cx: th.x + Math.sin(time * 0.05 + th.z * 0.01) * 8,
    cz: th.z + drift * 0.15 + Math.cos(time * 0.04) * 6,
  }
}

export function listThermalSamples(biomeId: string, time: number): ThermalSample[] {
  return getThermals(biomeId).map((th) => {
    const { cx, cz } = thermalCenter(th, time)
    return {
      cx,
      cz,
      radius: th.radius,
      strength: th.strength,
      y0: th.y0,
      y1: th.y1,
    }
  })
}

export type NearestThermal = {
  dist: number
  /** Radians relative to pilot yaw: + = right, − = left */
  relBearing: number
  strength: number
  inCore: boolean
  inColumn: boolean
  radius: number
}

export function nearestThermal(
  biomeId: string,
  time: number,
  pos: Vec3,
  yaw: number,
): NearestThermal | null {
  let best: NearestThermal | null = null
  for (const th of getThermals(biomeId)) {
    const { cx, cz } = thermalCenter(th, time)
    const dist = Math.hypot(pos.x - cx, pos.z - cz)
    const bearing = Math.atan2(cx - pos.x, cz - pos.z)
    let rel = bearing - yaw
    while (rel > Math.PI) rel -= Math.PI * 2
    while (rel < -Math.PI) rel += Math.PI * 2
    const inColumn = dist < th.radius && pos.y >= th.y0 && pos.y <= th.y1
    const inCore = dist < th.radius * 0.45 && inColumn
    const candidate: NearestThermal = {
      dist,
      relBearing: rel,
      strength: th.strength,
      inCore,
      inColumn,
      radius: th.radius,
    }
    if (!best || dist < best.dist) best = candidate
  }
  return best
}

function hashNoise(x: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.031 + t * 0.17) * 0.45 +
    Math.sin(z * 0.027 - t * 0.13) * 0.35 +
    Math.sin((x + z) * 0.019 + t * 0.09) * 0.25
  )
}

/**
 * Ambient wind + discrete thermals + ridge lift from terrain slope facing wind.
 */
export function sampleAtmosphere(
  config: BiomeConfig,
  time: number,
  pos: Vec3,
): Vec3 {
  const windDir = 0.35 // radians — prevailing
  const windSpeed = 2.2 + config.windStrength * 4
  const gust = hashNoise(pos.x, pos.z, time)
  const wx = Math.sin(windDir) * windSpeed * (1 + gust * 0.15)
  const wz = Math.cos(windDir) * windSpeed * (1 + gust * 0.12)
  let wy = hashNoise(pos.x * 0.5, pos.z * 0.5, time * 0.7) * 0.18 * config.thermalStrength

  for (const th of getThermals(config.id)) {
    const { cx, cz } = thermalCenter(th, time)
    const dx = pos.x - cx
    const dz = pos.z - cz
    const dist = Math.hypot(dx, dz)
    if (dist > th.radius) continue
    if (pos.y < th.y0 || pos.y > th.y1) continue
    const radial = 1 - dist / th.radius
    const core = radial * radial
    const heightBand = (() => {
      const t = (pos.y - th.y0) / Math.max(1, th.y1 - th.y0)
      // Smoothstep band — no sharp sin mid-column dips
      const s = Math.max(0, Math.min(1, t))
      return s * s * (3 - 2 * s) * (1 - Math.abs(s - 0.55) * 0.35)
    })()
    const pulse = 0.94 + 0.06 * Math.sin(time * 0.35 + th.x * 0.02)
    wy += th.strength * config.thermalStrength * core * heightBand * pulse
  }

  // Ridge lift: wind blowing into an upslope face
  const sample = 6
  const h0 = config.getHeight(pos.x, pos.z)
  const hx =
    (config.getHeight(pos.x + sample, pos.z) - config.getHeight(pos.x - sample, pos.z)) /
    (2 * sample)
  const hz =
    (config.getHeight(pos.x, pos.z + sample) - config.getHeight(pos.x, pos.z - sample)) /
    (2 * sample)
  const slopeIntoWind = -(hx * Math.sin(windDir) + hz * Math.cos(windDir))
  if (slopeIntoWind > 0.05 && pos.y - h0 < 55 && pos.y - h0 > 2) {
    const nearGround = 1 - Math.min(1, (pos.y - h0) / 55)
    wy += slopeIntoWind * windSpeed * 1.8 * nearGround * nearGround
  }

  return { x: wx, y: wy, z: wz }
}

/** Strength of lift at position for HUD / audio (positive = climb air). */
export function thermalHint(config: BiomeConfig, time: number, pos: Vec3): number {
  return sampleAtmosphere(config, time, pos).y
}

export type RidgeMarker = { x: number; y: number; z: number; facing: number }

/** Soft ridge-lift cue points for mountain faces (visual only). */
export function listRidgeMarkers(config: BiomeConfig): RidgeMarker[] {
  if (config.id !== 'mountains') return []
  const windDir = 0.35
  const markers: RidgeMarker[] = []
  const samples: [number, number][] = [
    [20, 40],
    [60, 90],
    [110, 70],
    [150, 130],
    [190, 100],
    [80, 160],
    [220, 170],
    [40, 120],
    [170, 50],
    [100, 200],
  ]
  for (const [x, z] of samples) {
    const sample = 6
    const h0 = config.getHeight(x, z)
    const hx =
      (config.getHeight(x + sample, z) - config.getHeight(x - sample, z)) / (2 * sample)
    const hz =
      (config.getHeight(x, z + sample) - config.getHeight(x, z - sample)) / (2 * sample)
    const slopeIntoWind = -(hx * Math.sin(windDir) + hz * Math.cos(windDir))
    if (slopeIntoWind < 0.08) continue
    markers.push({
      x,
      y: h0 + 6 + slopeIntoWind * 12,
      z,
      facing: windDir + Math.PI,
    })
  }
  return markers
}
