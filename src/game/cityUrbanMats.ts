import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { prepMap } from './pbrMaps'

/** Lean PBR sets for the city — fewer maps = smoother frames. */
export function useCityUrbanMaps() {
  const maps = useTexture({
    asphaltDiff: '/textures/tankfarm/asphalt_02_diff_1k.jpg',
    concreteDiff: '/textures/concrete_diff_1k.jpg',
  })

  return useMemo(() => {
    const asphalt = {
      map: maps.asphaltDiff.clone(),
      normalMap: maps.asphaltDiff.clone(),
      roughnessMap: maps.asphaltDiff.clone(),
    }
    prepMap(asphalt.map, 12, THREE.SRGBColorSpace)
    prepMap(asphalt.normalMap, 12)
    prepMap(asphalt.roughnessMap, 12)

    const sidewalk = {
      map: maps.concreteDiff.clone(),
      normalMap: maps.concreteDiff.clone(),
      roughnessMap: maps.concreteDiff.clone(),
    }
    prepMap(sidewalk.map, 6, THREE.SRGBColorSpace)
    prepMap(sidewalk.normalMap, 6)
    prepMap(sidewalk.roughnessMap, 6)

    const facade = {
      map: maps.concreteDiff.clone(),
      normalMap: maps.concreteDiff.clone(),
      roughnessMap: maps.concreteDiff.clone(),
    }
    prepMap(facade.map, 3.5, THREE.SRGBColorSpace)
    prepMap(facade.normalMap, 3.5)
    prepMap(facade.roughnessMap, 3.5)

    // Plate aliases concrete so underpass code can stay typed without extra downloads
    const plate = {
      map: maps.concreteDiff.clone(),
      normalMap: maps.concreteDiff.clone(),
      roughnessMap: maps.concreteDiff.clone(),
      metalnessMap: maps.concreteDiff.clone(),
    }
    prepMap(plate.map, 2.2, THREE.SRGBColorSpace)
    prepMap(plate.normalMap, 2.2)
    prepMap(plate.roughnessMap, 2.2)
    prepMap(plate.metalnessMap, 2.2)

    const lawn = {
      map: maps.concreteDiff.clone(),
      normalMap: maps.concreteDiff.clone(),
      roughnessMap: maps.concreteDiff.clone(),
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
