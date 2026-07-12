/** Local camera look offsets (not networked). */

let yaw = 0
let pitch = 0
let keyTarget: number | null = null
let mouseHeld = false

const MAX_YAW = Math.PI * 0.95
const MAX_PITCH = 0.55

export function getLookOffsets() {
  return { yaw, pitch, mouseHeld }
}

export function setKeyLookTarget(target: number | null) {
  keyTarget = target
}

export function setMouseLookHeld(held: boolean) {
  mouseHeld = held
  if (!held) keyTarget = null
}

export function addMouseLook(dx: number, dy: number) {
  yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw - dx * 0.0045))
  pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch - dy * 0.0032))
  keyTarget = null
}

/** Call every frame from the camera. */
export function tickLook(dt: number) {
  if (mouseHeld) return

  if (keyTarget != null) {
    const k = 1 - Math.pow(0.0002, dt)
    yaw += (keyTarget - yaw) * k
    pitch += (0 - pitch) * k
    return
  }

  // Spring back to forward when not looking
  const k = 1 - Math.pow(0.00008, dt)
  yaw += (0 - yaw) * k
  pitch += (0 - pitch) * k
  if (Math.abs(yaw) < 0.002) yaw = 0
  if (Math.abs(pitch) < 0.002) pitch = 0
}

export function resetLook() {
  yaw = 0
  pitch = 0
  keyTarget = null
  mouseHeld = false
}
