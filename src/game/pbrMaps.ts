import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { Biome } from '../types/game'

const HDRI: Record<Biome, string> = {
  beach: '/env/beach_1k.hdr',
  mountains: '/env/mountains_1k.hdr',
  city: '/env/city_1k.hdr',
}

export function biomeHdriPath(biome: Biome): string {
  return HDRI[biome]
}

/** Configure a loaded map for tiling ground / sail. */
export function prepMap(
  tex: THREE.Texture,
  repeat: number,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = 8
  tex.colorSpace = colorSpace
  tex.needsUpdate = true
  return tex
}

export type GroundMaps = {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
  normalScale: THREE.Vector2
  roughness: number
}

/** Biome ground PBR sets (Polyhaven 1k, CC0). */
export function useGroundMaps(biome: Biome): GroundMaps {
  const maps = useTexture({
    sandDiff: '/textures/sand_diff_1k.jpg',
    sandNor: '/textures/sand_nor_1k.jpg',
    sandRough: '/textures/sand_rough_1k.jpg',
    grassDiff: '/textures/grass_diff_1k.jpg',
    grassNor: '/textures/grass_nor_1k.jpg',
    grassRough: '/textures/grass_rough_1k.jpg',
    rockDiff: '/textures/rock_diff_1k.jpg',
    rockNor: '/textures/rock_nor_1k.jpg',
    rockRough: '/textures/rock_rough_1k.jpg',
    concreteDiff: '/textures/concrete_diff_1k.jpg',
    concreteNor: '/textures/concrete_nor_1k.jpg',
    concreteRough: '/textures/concrete_rough_1k.jpg',
  })

  return useMemo(() => {
    let map: THREE.Texture
    let normalMap: THREE.Texture
    let roughnessMap: THREE.Texture
    let repeat = 48
    let roughness = 0.9
    let normalScale = new THREE.Vector2(1.1, 1.1)

    if (biome === 'beach') {
      map = maps.sandDiff
      normalMap = maps.sandNor
      roughnessMap = maps.sandRough
      repeat = 16
      roughness = 0.9
      normalScale = new THREE.Vector2(0.65, 0.65)
    } else if (biome === 'mountains') {
      map = maps.rockDiff
      normalMap = maps.rockNor
      roughnessMap = maps.rockRough
      repeat = 28
      roughness = 0.88
      normalScale = new THREE.Vector2(1.35, 1.35)
    } else {
      map = maps.concreteDiff
      normalMap = maps.concreteNor
      roughnessMap = maps.concreteRough
      repeat = 36
      roughness = 0.86
      normalScale = new THREE.Vector2(0.85, 0.85)
    }

    prepMap(map, repeat, THREE.SRGBColorSpace)
    prepMap(normalMap, repeat)
    prepMap(roughnessMap, repeat)
    return { map, normalMap, roughnessMap, normalScale, roughness }
  }, [biome, maps])
}

export type SailMaps = {
  fabricMap: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

export function useSailFabricMaps(): SailMaps {
  const maps = useTexture({
    fabricMap: '/textures/fabric_diff_1k.jpg',
    normalMap: '/textures/fabric_nor_1k.jpg',
    roughnessMap: '/textures/fabric_rough_1k.jpg',
  })

  return useMemo(() => {
    prepMap(maps.fabricMap, 4, THREE.SRGBColorSpace)
    prepMap(maps.normalMap, 6)
    prepMap(maps.roughnessMap, 6)
    return {
      fabricMap: maps.fabricMap,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
    }
  }, [maps])
}
