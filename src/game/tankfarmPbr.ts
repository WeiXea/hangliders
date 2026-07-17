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

/** 1k Poly Haven PBR — keeps Tank Farm playable on integrated GPUs. */
export function useTankfarmSurfaces(): TankfarmSurfaces {
  const maps = useTexture({
    asphaltDiff: '/textures/tankfarm/asphalt_02_diff_1k.jpg',
    asphaltNor: '/textures/tankfarm/asphalt_02_nor_gl_1k.jpg',
    asphaltRough: '/textures/tankfarm/asphalt_02_rough_1k.jpg',
    rustyDiff: '/textures/tankfarm/rusty_metal_diff_1k.jpg',
    rustyNor: '/textures/tankfarm/rusty_metal_nor_gl_1k.jpg',
    rustyRough: '/textures/tankfarm/rusty_metal_rough_1k.jpg',
    plateDiff: '/textures/tankfarm/metal_plate_diff_1k.jpg',
    plateNor: '/textures/tankfarm/metal_plate_nor_gl_1k.jpg',
    plateRough: '/textures/tankfarm/metal_plate_rough_1k.jpg',
    plateMetal: '/textures/tankfarm/metal_plate_metal_1k.jpg',
  })

  return useMemo(() => {
    for (const t of Object.values(maps)) {
      t.anisotropy = 4
      t.generateMipmaps = true
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
    }
    prepMap(maps.asphaltDiff, 14, THREE.SRGBColorSpace)
    prepMap(maps.asphaltNor, 14)
    prepMap(maps.asphaltRough, 14)
    prepMap(maps.rustyDiff, 2.6, THREE.SRGBColorSpace)
    prepMap(maps.rustyNor, 2.6)
    prepMap(maps.rustyRough, 2.6)
    prepMap(maps.plateDiff, 2.0, THREE.SRGBColorSpace)
    prepMap(maps.plateNor, 2.0)
    prepMap(maps.plateRough, 2.0)
    prepMap(maps.plateMetal, 2.0)
    return {
      asphalt: {
        map: maps.asphaltDiff,
        normalMap: maps.asphaltNor,
        roughnessMap: maps.asphaltRough,
        normalScale: new THREE.Vector2(1.0, 1.0),
      },
      rusty: {
        map: maps.rustyDiff,
        normalMap: maps.rustyNor,
        roughnessMap: maps.rustyRough,
        normalScale: new THREE.Vector2(1.15, 1.15),
      },
      plate: {
        map: maps.plateDiff,
        normalMap: maps.plateNor,
        roughnessMap: maps.plateRough,
        metalnessMap: maps.plateMetal,
        normalScale: new THREE.Vector2(1.1, 1.1),
      },
    }
  }, [maps])
}
