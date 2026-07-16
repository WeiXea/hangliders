import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { prepMap } from './pbrMaps'

/** Shared PBR sets for GTA-lite urban streets / facades. */
export function useCityUrbanMaps() {
  const maps = useTexture({
    concreteDiff: '/textures/concrete_diff_1k.jpg',
    concreteNor: '/textures/concrete_nor_1k.jpg',
    concreteRough: '/textures/concrete_rough_1k.jpg',
    grassDiff: '/textures/grass_diff_1k.jpg',
    grassNor: '/textures/grass_nor_1k.jpg',
    grassRough: '/textures/grass_rough_1k.jpg',
  })

  return useMemo(() => {
    const asphalt = {
      map: maps.concreteDiff.clone(),
      normalMap: maps.concreteNor.clone(),
      roughnessMap: maps.concreteRough.clone(),
    }
    prepMap(asphalt.map, 14, THREE.SRGBColorSpace)
    prepMap(asphalt.normalMap, 14)
    prepMap(asphalt.roughnessMap, 14)

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
      lawn,
      asphaltTint: '#4a4e54',
      sidewalkTint: '#c5c8cc',
      lawnTint: '#5a8f4a',
      normalScale: new THREE.Vector2(0.9, 0.9),
    }
  }, [maps])
}
