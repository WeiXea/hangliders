import type { BiomeConfig } from '../types/game'

/** Coastal cliffs: land stays above sea inland; soft shelf only on the seaward side (high z). */
const SEA_LEVEL = 0.15
const SHORE_Z = 280

function beachHeight(x: number, z: number): number {
  const cliff = Math.max(0, Math.sin((x + 90) * 0.018) * 32 + Math.cos(z * 0.01) * 12)
  const dunes = Math.sin(x * 0.055) * Math.cos(z * 0.042) * 7
  const duneRidges = Math.max(0, Math.sin(x * 0.09 + z * 0.05) - 0.35) * 4.5
  const ripples = Math.sin(x * 0.28) * Math.cos(z * 0.22) * 0.85
  const terrace = Math.floor(Math.max(0, cliff) / 6) * 0.85
  const farDune = Math.sin(x * 0.018 + z * 0.014) * 5
  const rockOutcrop =
    Math.max(0, Math.sin(x * 0.085 + 2) * Math.cos(z * 0.075 - 1) - 0.65) * 8
  const wash =
    Math.max(0, Math.sin(x * 0.15) * Math.cos(z * 0.12) - 0.55) * 2.2

  let h =
    cliff * 0.85 + dunes + duneRidges + ripples + terrace + farDune + rockOutcrop + wash

  // Inland floor — never let valleys dip under the ocean plane
  if (z < SHORE_Z - 40) {
    h = Math.max(h, 3.2 + Math.abs(Math.sin(x * 0.03)) * 1.5)
  } else {
    // Soft beach shelf into the sea (z → SHORE_Z+)
    const t = Math.max(0, Math.min(1, (z - (SHORE_Z - 40)) / 90))
    const beach = 1.4 * (1 - t) + SEA_LEVEL * t
    h = Math.max(SEA_LEVEL, lerp(Math.max(h, 2.5), beach, t * t))
    // Past the shore: underwater shelf for a real coastline
    if (z > SHORE_Z + 30) {
      const deep = Math.min(1, (z - SHORE_Z - 30) / 200)
      h = SEA_LEVEL - deep * 8
    }
  }

  return h
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function mountainHeight(x: number, z: number): number {
  const base =
    Math.sin(x * 0.012) * 48 +
    Math.cos(z * 0.01) * 38 +
    Math.sin((x + z) * 0.008) * 30
  const peaks =
    Math.max(0, Math.sin(x * 0.006) * Math.cos(z * 0.0055)) ** 1.35 * 105
  const valley = Math.min(0, Math.sin(z * 0.022) * 16)
  const ridge = Math.abs(Math.sin(x * 0.026 + z * 0.018)) * 22
  const scree = Math.sin(x * 0.18) * Math.cos(z * 0.15) * 1.8
  const bench = Math.floor(Math.max(0, base + peaks) / 14) * 1.1
  const bowl = -Math.max(0, Math.sin(x * 0.04 + 1) * Math.cos(z * 0.035) - 0.4) * 12
  return Math.max(8, base + peaks + valley + ridge + scree + bench + bowl)
}

function cityHeight(x: number, z: number): number {
  // Downtown + municipal airfield share one flat deck
  const downtown = x > -170 && x < 250 && z > -30 && z < 220
  if (downtown) {
    const micro =
      Math.sin(x * 0.11) * Math.cos(z * 0.09) * 0.04 +
      Math.sin((x + z) * 0.05) * 0.03
    return Math.max(0, 0.12 + micro)
  }
  const park = Math.sin(x * 0.038) * 3.5 + Math.cos(z * 0.034) * 2.8
  const hill = Math.max(0, Math.sin((x + 50) * 0.018)) * 10
  const riverBank = z < -40 ? 1.1 : 0
  const plaza = Math.max(0, Math.sin(x * 0.07) * Math.cos(z * 0.06) - 0.55) * -1.2
  return Math.max(0, park + hill + riverBank + plaza)
}

/** Flat industrial yard with gentle undulation — tanks added in later steps. */
function tankfarmHeight(x: number, z: number): number {
  const und =
    Math.sin(x * 0.02) * Math.cos(z * 0.018) * 0.6 +
    Math.sin(x * 0.055 + z * 0.04) * 0.25
  return 2.2 + und
}

function moonHeight(x: number, z: number): number {
  const crater = Math.max(0, 1 - Math.hypot(x * 0.08, z * 0.08)) * -3
  const ripples = Math.sin(x * 0.15) * Math.cos(z * 0.13) * 1.2
  const regolith = Math.sin(x * 0.04 + z * 0.03) * 0.8
  return Math.max(-2, crater + ripples + regolith)
}

export const BIOME_CONFIGS: Record<string, BiomeConfig> = {
  beach: {
    id: 'beach',
    name: 'Coastal Cliffs',
    tagline: 'Sea breeze and golden dunes',
    launchPosition: { x: -38, y: 0, z: -18 },
    launchYaw: Math.PI * 0.12,
    windStrength: 0.5,
    thermalStrength: 0.48,
    fogColor: '#c5d9ef',
    fogNear: 120,
    fogFar: 1400,
    skyTurbidity: 5,
    skyRayleigh: 1.5,
    sunPosition: [140, 48, 90],
    getHeight: beachHeight,
    challengeRings: [
      { x: -5, y: 30, z: 30 },
      { x: 40, y: 36, z: 90 },
      { x: 100, y: 34, z: 160 },
      { x: 170, y: 28, z: 240 },
    ],
    landingZone: { center: { x: 200, y: 0, z: 290 }, radius: 28 },
    parkedGliders: [
      { x: 30, z: 70, yaw: 0.2 },
      { x: 90, z: 140, yaw: -0.3 },
      { x: 160, z: 210, yaw: 0.1 },
      { x: 220, z: 80, yaw: 1.2 },
      { x: -20, z: 120, yaw: 0.5 },
      { x: 120, z: 40, yaw: -0.8 },
      { x: 60, z: 200, yaw: 0.35 },
      { x: 180, z: 160, yaw: -0.5 },
    ],
  },
  mountains: {
    id: 'mountains',
    name: 'Alpine Ridge',
    tagline: 'Thermals over snow-capped peaks',
    launchPosition: { x: -35, y: 0, z: -45 },
    launchYaw: Math.PI * 0.08,
    windStrength: 0.55,
    thermalStrength: 0.75,
    fogColor: '#d0dce8',
    fogNear: 130,
    fogFar: 1450,
    skyTurbidity: 2.5,
    skyRayleigh: 0.65,
    sunPosition: [120, 60, 70],
    getHeight: mountainHeight,
    challengeRings: [
      { x: 10, y: 45, z: 20 },
      { x: 70, y: 55, z: 80 },
      { x: 140, y: 58, z: 150 },
      { x: 210, y: 50, z: 220 },
    ],
    landingZone: { center: { x: 240, y: 0, z: 280 }, radius: 28 },
    parkedGliders: [
      { x: 40, z: 50, yaw: 0.15 },
      { x: 100, z: 120, yaw: -0.4 },
      { x: 180, z: 180, yaw: 0.25 },
      { x: 250, z: 90, yaw: 1.0 },
      { x: -10, z: 100, yaw: 0.6 },
      { x: 150, z: 40, yaw: -1.1 },
      { x: 80, z: 200, yaw: 0.4 },
      { x: 200, z: 140, yaw: -0.2 },
    ],
  },
  city: {
    id: 'city',
    name: 'Urban Skyline',
    tagline: 'Streets, traffic, and rooftop lift',
    launchPosition: { x: 18, y: 0, z: 8 },
    launchYaw: Math.PI * 0.2,
    windStrength: 0.4,
    thermalStrength: 0.38,
    fogColor: '#a8b8c8',
    fogNear: 90,
    fogFar: 900,
    skyTurbidity: 4.5,
    skyRayleigh: 0.85,
    sunPosition: [140, 110, 70],
    getHeight: cityHeight,
    challengeRings: [
      { x: 5, y: 38, z: 25 },
      { x: 55, y: 48, z: 90 },
      { x: 115, y: 42, z: 160 },
      { x: 180, y: 36, z: 230 },
    ],
    landingZone: { center: { x: 210, y: 0, z: 280 }, radius: 26 },
    parkedGliders: [
      // Rooftop mounts — match relocated building centers
      { x: 33, z: 30, yaw: 0.2, buildingId: 1 },
      { x: 10, z: 54, yaw: -0.15, buildingId: 5 },
      { x: 54, z: 74, yaw: 0.35, buildingId: 7 },
      { x: 98, z: 52, yaw: -0.4, buildingId: 9 },
      { x: 120, z: 142, yaw: 0.1, buildingId: 17 },
      { x: 76, z: 164, yaw: -0.25, buildingId: 21 },
      { x: 186, z: 30, yaw: 0.55, buildingId: 27 },
      { x: 54, z: 174, yaw: -0.7, buildingId: 29 },
      { x: 174, z: 98, yaw: 0.12, buildingId: 14 },
      // Rooftop choppers
      { x: 186, z: 76, yaw: 0.2, buildingId: 15, craftType: 'helicopter' },
      { x: -32, z: 54, yaw: 0.15, buildingId: 19, craftType: 'helicopter' },
      { x: 120, z: 76, yaw: -0.2, buildingId: 12, craftType: 'helicopter' },
      // Skyline Municipal — F-35 on the apron
      { x: -135, z: 62, yaw: Math.PI / 2, craftType: 'jet' },
      // Starbase pad — Falcon-class stack (board via tower elevator)
      { x: -158, z: 28, yaw: Math.PI / 2, craftType: 'rocket' },
      // Street plaza spare gliders (kept clear of metro / underpasses)
      { x: 28, z: 52, yaw: 0.4 },
      { x: 118, z: 108, yaw: -0.5 },
    ],
  },
  moon: {
    id: 'moon',
    name: 'Lunar Surface',
    tagline: 'One small step',
    launchPosition: { x: 0, y: 0, z: 0 },
    launchYaw: 0,
    windStrength: 0,
    thermalStrength: 0,
    fogColor: '#000000',
    fogNear: 5000,
    fogFar: 8000,
    skyTurbidity: 0,
    skyRayleigh: 0.1,
    sunPosition: [200, 80, 100],
    getHeight: moonHeight,
    challengeRings: [],
    landingZone: { center: { x: 0, y: 0, z: 0 }, radius: 40 },
    parkedGliders: [],
  },
  tankfarm: {
    id: 'tankfarm',
    name: 'Tank Farm',
    tagline: 'Walk the industrial yard',
    launchPosition: { x: 32, y: 0, z: 58 },
    /** Face the big center tank at (32, 88) */
    launchYaw: 0,
    windStrength: 0.55,
    thermalStrength: 0.5,
    fogColor: '#7a7468',
    fogNear: 35,
    fogFar: 260,
    skyTurbidity: 6,
    skyRayleigh: 0.7,
    sunPosition: [90, 70, 40],
    getHeight: tankfarmHeight,
    challengeRings: [
      { x: 40, y: 42, z: 90 },
      { x: 100, y: 48, z: 140 },
      { x: 160, y: 44, z: 80 },
      { x: 60, y: 40, z: 200 },
    ],
    landingZone: { center: { x: 20, y: 0, z: 220 }, radius: 32 },
    parkedGliders: [
      { x: -12, z: 28, yaw: 0.3 },
      { x: 18, z: 55, yaw: -0.4 },
    ],
  },
}
