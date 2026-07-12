import type { BiomeConfig } from '../types/game'

function beachHeight(x: number, z: number): number {
  const cliff = Math.max(0, Math.sin((x + 55) * 0.035) * 22 + Math.cos(z * 0.02) * 8)
  const dunes = Math.sin(x * 0.12) * Math.cos(z * 0.09) * 4
  const terrace = Math.floor(Math.max(0, cliff) / 6) * 0.5
  const beachFlat = z > 25 ? Math.sin(x * 0.2) * 0.6 : 0
  return Math.max(0, cliff * 0.85 + dunes + terrace + beachFlat)
}

function mountainHeight(x: number, z: number): number {
  const base =
    Math.sin(x * 0.022) * 35 +
    Math.cos(z * 0.018) * 28 +
    Math.sin((x + z) * 0.015) * 22
  const peaks =
    Math.max(0, Math.sin(x * 0.011) * Math.cos(z * 0.009)) ** 1.4 * 75
  const valley = Math.min(0, Math.sin(z * 0.04) * 12)
  const ridge = Math.abs(Math.sin(x * 0.05 + z * 0.03)) * 15
  return Math.max(8, base + peaks + valley + ridge)
}

function cityHeight(x: number, z: number): number {
  const park = Math.sin(x * 0.08) * 2.5 + Math.cos(z * 0.07) * 2
  const hill = Math.max(0, Math.sin((x + 30) * 0.04)) * 6
  const riverBank = z < -15 ? 0.8 : 0
  return Math.max(0, park + hill + riverBank)
}

export const BIOME_CONFIGS: Record<string, BiomeConfig> = {
  beach: {
    id: 'beach',
    name: 'Coastal Cliffs',
    tagline: 'Sea breeze and golden dunes',
    launchPosition: { x: -35, y: 0, z: -15 },
    launchYaw: Math.PI * 0.15,
    windStrength: 0.4,
    thermalStrength: 0.25,
    fogColor: '#b8d4f0',
    fogNear: 60,
    fogFar: 420,
    skyTurbidity: 6,
    skyRayleigh: 1.4,
    sunPosition: [120, 42, 80],
    getHeight: beachHeight,
    challengeRings: [
      { x: -5, y: 28, z: 15 },
      { x: 20, y: 32, z: 50 },
      { x: 50, y: 30, z: 85 },
      { x: 85, y: 26, z: 120 },
    ],
    landingZone: { center: { x: 100, y: 0, z: 145 }, radius: 22 },
  },
  mountains: {
    id: 'mountains',
    name: 'Alpine Ridge',
    tagline: 'Thermals over snow-capped peaks',
    launchPosition: { x: -20, y: 0, z: -30 },
    launchYaw: Math.PI * 0.1,
    windStrength: 0.55,
    thermalStrength: 0.7,
    fogColor: '#c8d8e8',
    fogNear: 55,
    fogFar: 400,
    skyTurbidity: 3,
    skyRayleigh: 0.7,
    sunPosition: [100, 55, 60],
    getHeight: mountainHeight,
    challengeRings: [
      { x: 5, y: 40, z: 5 },
      { x: 35, y: 48, z: 40 },
      { x: 70, y: 52, z: 75 },
      { x: 105, y: 45, z: 110 },
    ],
    landingZone: { center: { x: 120, y: 0, z: 140 }, radius: 22 },
  },
  city: {
    id: 'city',
    name: 'Urban Skyline',
    tagline: 'Glide above rooftops and rivers',
    launchPosition: { x: -25, y: 0, z: -20 },
    launchYaw: Math.PI * 0.05,
    windStrength: 0.35,
    thermalStrength: 0.15,
    fogColor: '#a8b8c8',
    fogNear: 50,
    fogFar: 360,
    skyTurbidity: 8,
    skyRayleigh: 1.3,
    sunPosition: [80, 38, 100],
    getHeight: cityHeight,
    challengeRings: [
      { x: 0, y: 35, z: 10 },
      { x: 25, y: 42, z: 45 },
      { x: 55, y: 38, z: 80 },
      { x: 90, y: 32, z: 115 },
    ],
    landingZone: { center: { x: 105, y: 0, z: 140 }, radius: 20 },
  },
}
