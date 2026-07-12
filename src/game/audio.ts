let ctx: AudioContext | null = null
let windNode: OscillatorNode | null = null
let windGain: GainNode | null = null
let started = false

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function startWindAudio(airspeed: number, phase: string) {
  if (phase !== 'flying' && phase !== 'running') {
    stopWindAudio()
    return
  }

  const ac = getCtx()
  if (ac.state === 'suspended') ac.resume()

  if (!started) {
    windNode = ac.createOscillator()
    windGain = ac.createGain()
    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 400
    filter.Q.value = 0.5

    windNode.type = 'sawtooth'
    windNode.frequency.value = 80
    windGain.gain.value = 0
    windNode.connect(filter)
    filter.connect(windGain)
    windGain.connect(ac.destination)
    windNode.start()
    started = true
  }

  if (windNode && windGain) {
    windNode.frequency.setTargetAtTime(60 + airspeed * 4, ac.currentTime, 0.1)
    windGain.gain.setTargetAtTime(Math.min(0.08, airspeed * 0.003), ac.currentTime, 0.1)
  }
}

export function stopWindAudio() {
  if (windNode) {
    windNode.stop()
    windNode.disconnect()
    windNode = null
    windGain = null
    started = false
  }
}

export function playLandingSound(success: boolean) {
  const ac = getCtx()
  if (ac.state === 'suspended') ac.resume()

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)

  if (success) {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ac.currentTime + 0.3)
    gain.gain.setValueAtTime(0.15, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5)
    osc.start()
    osc.stop(ac.currentTime + 0.5)
  } else {
    osc.type = 'square'
    osc.frequency.setValueAtTime(120, ac.currentTime)
    gain.gain.setValueAtTime(0.12, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4)
    osc.start()
    osc.stop(ac.currentTime + 0.4)
  }
}

export function playRingSound() {
  const ac = getCtx()
  if (ac.state === 'suspended') ac.resume()

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1320, ac.currentTime + 0.15)
  gain.gain.setValueAtTime(0.1, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3)
  osc.start()
  osc.stop(ac.currentTime + 0.3)
}
