let ctx: AudioContext | null = null
let windSrc: AudioBufferSourceNode | null = null
let windFilter: BiquadFilterNode | null = null
let windGain: GainNode | null = null
let windStarted = false
let lastPhase = ''

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function makeNoiseBuffer(ac: AudioContext, seconds = 2): AudioBuffer {
  const rate = ac.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ac.createBuffer(1, len, rate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    // Brown-ish noise — softer, more wind-like than white
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buf
}

export function startWindAudio(airspeed: number, phase: string) {
  if (phase !== 'flying' && phase !== 'running') {
    stopWindAudio()
    lastPhase = phase
    return
  }

  const ac = getCtx()
  if (ac.state === 'suspended') void ac.resume()

  if (phase === 'running' && lastPhase !== 'running' && lastPhase !== 'flying') {
    playWhoosh(0.08, 180, 0.25)
  }
  if (phase === 'flying' && lastPhase === 'running') {
    playWhoosh(0.14, 220, 0.45)
  }
  lastPhase = phase

  if (!windStarted) {
    windSrc = ac.createBufferSource()
    windSrc.buffer = makeNoiseBuffer(ac, 2.5)
    windSrc.loop = true

    windFilter = ac.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 280
    windFilter.Q.value = 0.7

    const low = ac.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 900

    windGain = ac.createGain()
    windGain.gain.value = 0

    windSrc.connect(windFilter)
    windFilter.connect(low)
    low.connect(windGain)
    windGain.connect(ac.destination)
    windSrc.start()
    windStarted = true
  }

  if (windFilter && windGain) {
    const flying = phase === 'flying'
    const base = flying ? 0.045 : 0.02
    const level = Math.min(0.14, base + airspeed * 0.0035)
    const freq = flying ? 220 + airspeed * 12 : 160 + airspeed * 6
    windFilter.frequency.setTargetAtTime(freq, ac.currentTime, 0.12)
    windGain.gain.setTargetAtTime(level, ac.currentTime, 0.15)
  }
}

export function stopWindAudio() {
  if (windSrc) {
    try {
      windSrc.stop()
    } catch {
      /* already stopped */
    }
    windSrc.disconnect()
    windSrc = null
  }
  windFilter = null
  windGain = null
  windStarted = false
}

function playWhoosh(gainPeak: number, freq: number, dur: number) {
  const ac = getCtx()
  if (ac.state === 'suspended') void ac.resume()

  const src = ac.createBufferSource()
  src.buffer = makeNoiseBuffer(ac, 1)
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = 0.8
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.001, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(gainPeak, ac.currentTime + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
  filter.frequency.exponentialRampToValueAtTime(freq * 0.5, ac.currentTime + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start()
  src.stop(ac.currentTime + dur + 0.05)
}

export function playLandingSound(success: boolean) {
  const ac = getCtx()
  if (ac.state === 'suspended') void ac.resume()

  if (success) {
    // Soft turf thud + brief air release
    playWhoosh(0.1, 140, 0.35)
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(90, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(45, ac.currentTime + 0.2)
    gain.gain.setValueAtTime(0.12, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + 0.4)

    // Soft success chime
    const chime = ac.createOscillator()
    const cg = ac.createGain()
    chime.type = 'sine'
    chime.frequency.setValueAtTime(523, ac.currentTime + 0.15)
    chime.frequency.setValueAtTime(659, ac.currentTime + 0.3)
    cg.gain.setValueAtTime(0.001, ac.currentTime + 0.15)
    cg.gain.exponentialRampToValueAtTime(0.06, ac.currentTime + 0.2)
    cg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.7)
    chime.connect(cg)
    cg.connect(ac.destination)
    chime.start(ac.currentTime + 0.15)
    chime.stop(ac.currentTime + 0.75)
  } else {
    playWhoosh(0.16, 90, 0.4)
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(70, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(35, ac.currentTime + 0.35)
    gain.gain.setValueAtTime(0.1, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4)
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + 0.45)
  }
}

export function playRingSound() {
  const ac = getCtx()
  if (ac.state === 'suspended') void ac.resume()

  playWhoosh(0.06, 600, 0.2)
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(740, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1180, ac.currentTime + 0.12)
  gain.gain.setValueAtTime(0.08, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.28)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + 0.3)
}
