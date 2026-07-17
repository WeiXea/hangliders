import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { prepMap } from './pbrMaps'

export type TankfarmSurfaces = {
  asphalt: {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    normalScale: THREE.Vector2
  }
  rusty: {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    normalScale: THREE.Vector2
  }
  plate: {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    metalnessMap: THREE.Texture
    normalScale: THREE.Vector2
  }
}

/** Poly Haven CC0 PBR sets for the walkable Tank Farm yard. */
export function useTankfarmSurfaces(): TankfarmSurfaces {
  const maps = useTexture({
    asphaltDiff: '/textures/tankfarm/asphalt_02_diff_2k.jpg',
    asphaltNor: '/textures/tankfarm/asphalt_02_nor_gl_2k.jpg',
    asphaltRough: '/textures/tankfarm/asphalt_02_rough_2k.jpg',
    rustyDiff: '/textures/tankfarm/rusty_metal_diff_2k.jpg',
    rustyNor: '/textures/tankfarm/rusty_metal_nor_gl_2k.jpg',
    rustyRough: '/textures/tankfarm/rusty_metal_rough_2k.jpg',
    plateDiff: '/textures/tankfarm/metal_plate_diff_2k.jpg',
    plateNor: '/textures/tankfarm/metal_plate_nor_gl_2k.jpg',
    plateRough: '/textures/tankfarm/metal_plate_rough_2k.jpg',
    plateMetal: '/textures/tankfarm/metal_plate_metal_2k.jpg',
  })

  return useMemo(() => {
    prepMap(maps.asphaltDiff, 18, THREE.SRGBColorSpace)
    prepMap(maps.asphaltNor, 18)
    prepMap(maps.asphaltRough, 18)
    prepMap(maps.rustyDiff, 3.2, THREE.SRGBColorSpace)
    prepMap(maps.rustyNor, 3.2)
    prepMap(maps.rustyRough, 3.2)
    prepMap(maps.plateDiff, 2.4, THREE.SRGBColorSpace)
    prepMap(maps.plateNor, 2.4)
    prepMap(maps.plateRough, 2.4)
    prepMap(maps.plateMetal, 2.4)
    return {
      asphalt: {
        map: maps.asphaltDiff,
        normalMap: maps.asphaltNor,
        roughnessMap: maps.asphaltRough,
        normalScale: new THREE.Vector2(1.15, 1.15),
      },
      rusty: {
        map: maps.rustyDiff,
        normalMap: maps.rustyNor,
        roughnessMap: maps.rustyRough,
        normalScale: new THREE.Vector2(1.4, 1.4),
      },
      plate: {
        map: maps.plateDiff,
        normalMap: maps.plateNor,
        roughnessMap: maps.plateRough,
        metalnessMap: maps.plateMetal,
        normalScale: new THREE.Vector2(1.25, 1.25),
      },
    }
  }, [maps])
}
