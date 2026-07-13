import type { BiomeConfig } from '../types/game'

/** Longer-wavelength terrain for a ~2× world with finer local detail */
function beachHeight(x: number, z: number): number {
  const cliff = Math.max(0, Math.sin((x + 90) * 0.018) * 32 + Math.cos(z * 0.01) * 12)
  const dunes = Math.sin(x * 0.06) * Math.cos(z * 0.048) * 5.5
  const ripples = Math.sin(x * 0.22) * Math.cos(z * 0.18) * 0.55
  const terrace = Math.floor(Math.max(0, cliff) / 7) * 0.65
  const beachFlat = z > 50 ? Math.sin(x * 0.1) * 0.55 : 0
  const farDune = Math.sin(x * 0.02 + z * 0.016) * 4
  const rockOutcrop =
    Math.max(0, Math.sin(x * 0.09 + 2) * Math.cos(z * 0.08 - 1) - 0.72) * 6
  return Math.max(0, cliff * 0.85 + dunes + ripples + terrace + beachFlat + farDune + rockOutcrop)
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
  const scree = Math.sin(x * 0.18) * Math.cos(z * 0.15) * 1.2
  return Math.max(8, base + peaks + valley + ridge + scree)
}

function cityHeight(x: number, z: number): number {
  const park = Math.sin(x * 0.04) * 3.2 + Math.cos(z * 0.038) * 2.6
  const hill = Math.max(0, Math.sin((x + 50) * 0.02)) * 9
  const riverBank = z < -40 ? 1.1 : 0
  const curb =
    Math.abs(((x % 22) + 22) % 22 - 11) < 1.4 || Math.abs(((z % 22) + 22) % 22 - 11) < 1.4
      ? 0.12
      : 0
  return Math.max(0, park + hill + riverBank + curb)
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
    tagline: 'Glide above rooftops and rivers',
    launchPosition: { x: -40, y: 0, z: -35 },
    launchYaw: Math.PI * 0.05,
    windStrength: 0.4,
    thermalStrength: 0.38,
    fogColor: '#b4c0cc',
    fogNear: 110,
    fogFar: 1300,
    skyTurbidity: 7,
    skyRayleigh: 1.35,
    sunPosition: [100, 42, 110],
    getHeight: cityHeight,
    challengeRings: [
      { x: 5, y: 38, z: 25 },
      { x: 55, y: 48, z: 90 },
      { x: 115, y: 42, z: 160 },
      { x: 180, y: 36, z: 230 },
    ],
    landingZone: { center: { x: 210, y: 0, z: 280 }, radius: 26 },
    parkedGliders: [
      { x: 25, z: 50, yaw: 0.1 },
      { x: 80, z: 100, yaw: -0.2 },
      { x: 140, z: 160, yaw: 0.3 },
      { x: 200, z: 70, yaw: 0.9 },
      { x: 0, z: 110, yaw: 0.4 },
      { x: 160, z: 30, yaw: -0.7 },
      { x: 100, z: 180, yaw: 0.15 },
      { x: 50, z: 140, yaw: -0.9 },
    ],
  },
}
