import type { BiomeConfig } from '../types/game'

/** Longer-wavelength terrain for a ~2× world */
function beachHeight(x: number, z: number): number {
  const cliff = Math.max(0, Math.sin((x + 90) * 0.02) * 28 + Math.cos(z * 0.012) * 10)
  const dunes = Math.sin(x * 0.07) * Math.cos(z * 0.055) * 5
  const terrace = Math.floor(Math.max(0, cliff) / 7) * 0.6
  const beachFlat = z > 40 ? Math.sin(x * 0.12) * 0.7 : 0
  const farDune = Math.sin(x * 0.025 + z * 0.02) * 3
  return Math.max(0, cliff * 0.85 + dunes + terrace + beachFlat + farDune)
}

function mountainHeight(x: number, z: number): number {
  const base =
    Math.sin(x * 0.014) * 42 +
    Math.cos(z * 0.011) * 34 +
    Math.sin((x + z) * 0.01) * 26
  const peaks =
    Math.max(0, Math.sin(x * 0.007) * Math.cos(z * 0.006)) ** 1.35 * 90
  const valley = Math.min(0, Math.sin(z * 0.025) * 14)
  const ridge = Math.abs(Math.sin(x * 0.03 + z * 0.02)) * 18
  return Math.max(8, base + peaks + valley + ridge)
}

function cityHeight(x: number, z: number): number {
  const park = Math.sin(x * 0.05) * 2.8 + Math.cos(z * 0.045) * 2.2
  const hill = Math.max(0, Math.sin((x + 50) * 0.025)) * 8
  const riverBank = z < -30 ? 0.8 : 0
  return Math.max(0, park + hill + riverBank)
}

export const BIOME_CONFIGS: Record<string, BiomeConfig> = {
  beach: {
    id: 'beach',
    name: 'Coastal Cliffs',
    tagline: 'Sea breeze and golden dunes',
    launchPosition: { x: -50, y: 0, z: -25 },
    launchYaw: Math.PI * 0.12,
    windStrength: 0.45,
    thermalStrength: 0.28,
    fogColor: '#c5d9ef',
    fogNear: 100,
    fogFar: 780,
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
    fogNear: 90,
    fogFar: 750,
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
  },
  city: {
    id: 'city',
    name: 'Urban Skyline',
    tagline: 'Glide above rooftops and rivers',
    launchPosition: { x: -40, y: 0, z: -35 },
    launchYaw: Math.PI * 0.05,
    windStrength: 0.35,
    thermalStrength: 0.15,
    fogColor: '#b4c0cc',
    fogNear: 80,
    fogFar: 680,
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
  },
}
