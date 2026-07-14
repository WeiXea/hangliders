import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { prepMap } from './pbrMaps'

/** Shared PBR detail for metal / paint skins (Polyhaven concrete as micro-panel). */
export function usePaintSkinMaps(repeat = 2.5) {
  const maps = useTexture({
    normalMap: '/textures/concrete_nor_1k.jpg',
    roughnessMap: '/textures/concrete_rough_1k.jpg',
  })
  return useMemo(() => {
    // Shared cached textures — keep repeat stable across all vehicles
    prepMap(maps.normalMap, 2.5)
    prepMap(maps.roughnessMap, 2.5)
    return {
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
    }
  }, [maps, repeat])
}

let jetPanelTex: THREE.CanvasTexture | null = null
/** Stealth RAM gray with sawtooth panel lines + mottling. */
export function getJetPanelTexture(): THREE.CanvasTexture {
  if (jetPanelTex) return jetPanelTex
  const size = 1024
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!

  g.fillStyle = '#63696f'
  g.fillRect(0, 0, size, size)

  // Mottled RAM tiles
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const w = 40 + Math.random() * 120
    const h = 30 + Math.random() * 90
    g.fillStyle = `rgba(${90 + Math.random() * 40},${95 + Math.random() * 40},${100 + Math.random() * 40},${0.08 + Math.random() * 0.12})`
    g.fillRect(x, y, w, h)
  }

  // Horizontal / vertical panel seams
  g.strokeStyle = 'rgba(20,22,26,0.45)'
  g.lineWidth = 2
  for (let i = 1; i < 12; i++) {
    const y = (i / 12) * size
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(size, y)
    g.stroke()
  }
  for (let i = 1; i < 10; i++) {
    const x = (i / 10) * size
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, size)
    g.stroke()
  }

  // Sawtooth stealth edges
  g.strokeStyle = 'rgba(15,16,18,0.55)'
  g.lineWidth = 2.5
  for (let row = 0; row < 6; row++) {
    const y0 = 80 + row * 150
    g.beginPath()
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * size
      const y = y0 + (i % 2 === 0 ? 0 : 18)
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }

  // Soft dirt / AO vignette
  const vig = g.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.75)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.22)')
  g.fillStyle = vig
  g.fillRect(0, 0, size, size)

  jetPanelTex = new THREE.CanvasTexture(c)
  jetPanelTex.colorSpace = THREE.SRGBColorSpace
  jetPanelTex.wrapS = jetPanelTex.wrapT = THREE.RepeatWrapping
  jetPanelTex.repeat.set(2, 2)
  jetPanelTex.anisotropy = 12
  return jetPanelTex
}

let heliPaintTex: THREE.CanvasTexture | null = null
export function getHeliPaintTexture(): THREE.CanvasTexture {
  if (heliPaintTex) return heliPaintTex
  const size = 512
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#2d6a4f'
  g.fillRect(0, 0, size, size)
  // Accent stripe
  g.fillStyle = '#ffd60a'
  g.fillRect(0, size * 0.42, size, size * 0.08)
  g.fillStyle = '#1b4332'
  g.fillRect(0, size * 0.5, size, size * 0.04)
  // Panel lines
  g.strokeStyle = 'rgba(0,0,0,0.25)'
  g.lineWidth = 2
  for (let i = 1; i < 8; i++) {
    g.beginPath()
    g.moveTo((i / 8) * size, 0)
    g.lineTo((i / 8) * size, size)
    g.stroke()
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`
    g.fillRect(Math.random() * size, Math.random() * size, 20, 14)
  }
  heliPaintTex = new THREE.CanvasTexture(c)
  heliPaintTex.colorSpace = THREE.SRGBColorSpace
  heliPaintTex.wrapS = heliPaintTex.wrapT = THREE.RepeatWrapping
  heliPaintTex.repeat.set(2, 1)
  heliPaintTex.anisotropy = 10
  return heliPaintTex
}

const carPaintCache = new Map<string, THREE.CanvasTexture>()
/** Automotive paint with clearcoat-friendly panel seams + dirt. */
export function getCarPaintTexture(hex: string, stripe?: 'taxi' | 'police' | null): THREE.CanvasTexture {
  const key = `${hex}|${stripe ?? ''}`
  const hit = carPaintCache.get(key)
  if (hit) return hit
  const size = 512
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = hex
  g.fillRect(0, 0, size, size)

  // Subtle metallic flake noise
  for (let i = 0; i < 800; i++) {
    g.fillStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.03})`
    g.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5)
  }

  // Door / panel seams
  g.strokeStyle = 'rgba(0,0,0,0.28)'
  g.lineWidth = 3
  ;[0.28, 0.5, 0.72].forEach((t) => {
    g.beginPath()
    g.moveTo(t * size, size * 0.15)
    g.lineTo(t * size, size * 0.85)
    g.stroke()
  })
  g.beginPath()
  g.moveTo(size * 0.1, size * 0.55)
  g.lineTo(size * 0.9, size * 0.55)
  g.stroke()

  if (stripe === 'taxi') {
    // Checker band
    const ch = 28
    for (let x = 0; x < size; x += ch) {
      for (let y = size * 0.38; y < size * 0.55; y += ch) {
        const on = ((x / ch + y / ch) | 0) % 2 === 0
        g.fillStyle = on ? '#111' : '#ffd60a'
        g.fillRect(x, y, ch, ch)
      }
    }
  }
  if (stripe === 'police') {
    g.fillStyle = '#1d3557'
    g.fillRect(0, size * 0.35, size, size * 0.12)
    g.fillStyle = '#e63946'
    g.fillRect(0, size * 0.47, size, size * 0.06)
  }

  // Edge AO
  const vig = g.createLinearGradient(0, 0, 0, size)
  vig.addColorStop(0, 'rgba(0,0,0,0.18)')
  vig.addColorStop(0.5, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.22)')
  g.fillStyle = vig
  g.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 10
  carPaintCache.set(key, tex)
  return tex
}

let spacexLogoTex: THREE.CanvasTexture | null = null
export function getSpaceXLogoTexture(): THREE.CanvasTexture {
  if (spacexLogoTex) return spacexLogoTex
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = 'rgba(0,0,0,0)'
  g.fillRect(0, 0, 512, 128)
  g.fillStyle = '#ffffff'
  g.font = 'bold 72px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('SpaceX', 256, 64)
  g.strokeStyle = '#adb5bd'
  g.lineWidth = 2
  g.strokeText('SpaceX', 256, 64)
  spacexLogoTex = new THREE.CanvasTexture(c)
  spacexLogoTex.colorSpace = THREE.SRGBColorSpace
  spacexLogoTex.anisotropy = 8
  return spacexLogoTex
}

let tireTex: THREE.CanvasTexture | null = null
export function getTireTexture(): THREE.CanvasTexture {
  if (tireTex) return tireTex
  const size = 256
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#1a1a1a'
  g.fillRect(0, 0, size, size)
  g.strokeStyle = '#2a2a2a'
  g.lineWidth = 3
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    g.beginPath()
    g.moveTo(size / 2 + Math.cos(a) * 40, size / 2 + Math.sin(a) * 40)
    g.lineTo(size / 2 + Math.cos(a) * 110, size / 2 + Math.sin(a) * 110)
    g.stroke()
  }
  tireTex = new THREE.CanvasTexture(c)
  tireTex.colorSpace = THREE.SRGBColorSpace
  tireTex.wrapS = tireTex.wrapT = THREE.RepeatWrapping
  return tireTex
}

/** Lofted elliptical body along Z — smooth aircraft/vehicle fuselage. */
export function createLoftBody(
  stations: { z: number; rx: number; ry: number }[],
  radial = 20,
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const rings = stations.length

  for (let i = 0; i < rings; i++) {
    const st = stations[i]!
    const v = i / Math.max(1, rings - 1)
    for (let j = 0; j <= radial; j++) {
      const u = j / radial
      const a = u * Math.PI * 2
      positions.push(Math.cos(a) * st.rx, Math.sin(a) * st.ry, st.z)
      uvs.push(u, v)
    }
  }
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j
      const b = a + radial + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
