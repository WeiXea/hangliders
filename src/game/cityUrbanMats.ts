import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { prepMap } from './pbrMaps'

/** Shared PBR sets for GTA-lite urban streets / facades / underpasses. */
export function useCityUrbanMaps() {
  const maps = useTexture({
    asphaltDiff: '/textures/tankfarm/asphalt_02_diff_1k.jpg',
    asphaltNor: '/textures/tankfarm/asphalt_02_nor_gl_1k.jpg',
    asphaltRough: '/textures/tankfarm/asphalt_02_rough_1k.jpg',
    concreteDiff: '/textures/concrete_diff_1k.jpg',
    concreteNor: '/textures/concrete_nor_1k.jpg',
    concreteRough: '/textures/concrete_rough_1k.jpg',
    plateDiff: '/textures/tankfarm/metal_plate_diff_1k.jpg',
    plateNor: '/textures/tankfarm/metal_plate_nor_gl_1k.jpg',
    plateRough: '/textures/tankfarm/metal_plate_rough_1k.jpg',
    plateMetal: '/textures/tankfarm/metal_plate_metal_1k.jpg',
    grassDiff: '/textures/grass_diff_1k.jpg',
    grassNor: '/textures/grass_nor_1k.jpg',
    grassRough: '/textures/grass_rough_1k.jpg',
  })

  return useMemo(() => {
    const asphalt = {
      map: maps.asphaltDiff.clone(),
      normalMap: maps.asphaltNor.clone(),
      roughnessMap: maps.asphaltRough.clone(),
    }
    prepMap(asphalt.map, 12, THREE.SRGBColorSpace)
    prepMap(asphalt.normalMap, 12)
    prepMap(asphalt.roughnessMap, 12)

    const sidewalk = {
      map: maps.concreteDiff.clone(),
      normalMap: maps.concreteNor.clone(),
      roughnessMap: maps.concreteRough.clone(),
    }
    prepMap(sidewalk.map, 6, THREE.SRGBColorSpace)
    prepMap(sidewalk.normalMap, 6)
    prepMap(sidewalk.roughnessMap, 6)

    const facade = {
      map: maps.concreteDiff.clone(),
      normalMap: maps.concreteNor.clone(),
      roughnessMap: maps.concreteRough.clone(),
    }
    prepMap(facade.map, 3.5, THREE.SRGBColorSpace)
    prepMap(facade.normalMap, 3.5)
    prepMap(facade.roughnessMap, 3.5)

    const plate = {
      map: maps.plateDiff.clone(),
      normalMap: maps.plateNor.clone(),
      roughnessMap: maps.plateRough.clone(),
      metalnessMap: maps.plateMetal.clone(),
    }
    prepMap(plate.map, 2.2, THREE.SRGBColorSpace)
    prepMap(plate.normalMap, 2.2)
    prepMap(plate.roughnessMap, 2.2)
    prepMap(plate.metalnessMap, 2.2)

    const lawn = {
      map: maps.grassDiff.clone(),
      normalMap: maps.grassNor.clone(),
      roughnessMap: maps.grassRough.clone(),
    }
    prepMap(lawn.map, 10, THREE.SRGBColorSpace)
    prepMap(lawn.normalMap, 10)
    prepMap(lawn.roughnessMap, 10)

    return {
      asphalt,
      sidewalk,
      facade,
      plate,
      lawn,
      asphaltTint: '#6a6e74',
      sidewalkTint: '#c5c8cc',
      lawnTint: '#5a8f4a',
      normalScale: new THREE.Vector2(1.05, 1.05),
    }
  }, [maps])
}
