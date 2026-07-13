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

export function startWindAudio(
  airspeed: number,
  phase: string,
  bank = 0,
  lift = 0,
) {
  if (phase !== 'flying' && phase !== 'running' && phase !== 'freefall' && phase !== 'parachuting') {
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
  if (phase === 'freefall' && lastPhase === 'flying') {
    playWhoosh(0.18, 160, 0.55)
  }
  if (phase === 'parachuting' && lastPhase === 'freefall') {
    playWhoosh(0.12, 140, 0.4)
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
    const fall = phase === 'freefall'
    const chute = phase === 'parachuting'
    const bankBoost = Math.min(0.04, Math.abs(bank) * 0.05)
    const liftBoost = Math.min(0.035, Math.max(0, lift) * 0.012)
    const base = fall ? 0.08 : chute ? 0.035 : flying ? 0.045 : 0.02
    const level = Math.min(0.2, base + airspeed * 0.0035 + bankBoost + liftBoost)
    const freq = fall
      ? 380 + airspeed * 8
      : chute
        ? 180 + airspeed * 5
        : flying
          ? 220 + airspeed * 12 + Math.abs(bank) * 40
          : 160 + airspeed * 6
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
  stopVario()
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

/** Hard facade / terrain impact — boom + glass shatter sting. */
export function playCrashImpact() {
  const ac = getCtx()
  if (ac.state === 'suspended') void ac.resume()

  playWhoosh(0.22, 70, 0.55)

  const boom = ac.createOscillator()
  const bg = ac.createGain()
  boom.type = 'sawtooth'
  boom.frequency.setValueAtTime(55, ac.currentTime)
  boom.frequency.exponentialRampToValueAtTime(28, ac.currentTime + 0.45)
  bg.gain.setValueAtTime(0.18, ac.currentTime)
  bg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.55)
  const low = ac.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 280
  boom.connect(low)
  low.connect(bg)
  bg.connect(ac.destination)
  boom.start()
  boom.stop(ac.currentTime + 0.6)

  // Glass / metal clatter
  for (let i = 0; i < 4; i++) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const t0 = ac.currentTime + 0.04 + i * 0.05
    osc.type = i % 2 === 0 ? 'triangle' : 'square'
    osc.frequency.setValueAtTime(900 + i * 220, t0)
    osc.frequency.exponentialRampToValueAtTime(180 + i * 40, t0 + 0.2)
    gain.gain.setValueAtTime(0.001, t0)
    gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 400
    osc.connect(hp)
    hp.connect(gain)
    gain.connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + 0.25)
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

let stepAcc = 0
let lastInteract = false

/** Soft footfall ticks while walking / sprinting. */
export function tickFootsteps(
  speed: number,
  phase: string,
  sprint = false,
  surface: 'sand' | 'grass' | 'city' = 'sand',
) {
  if (phase !== 'walking' || speed < 0.35) {
    stepAcc = 0
    return
  }
  const ac = getCtx()
  if (ac.state === 'suspended') void ac.resume()
  const interval = sprint ? 0.28 : 0.42
  stepAcc += 1 / 60
  if (stepAcc < interval) return
  stepAcc = 0

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = surface === 'city' ? 380 : surface === 'grass' ? 260 : 200
  osc.type = 'triangle'
  osc.frequency.value = 70 + Math.random() * 40
  gain.gain.setValueAtTime(surface === 'city' ? 0.034 : 0.04, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + 0.11)

  // Soft sand/grass rustle layer
  if (surface !== 'city') {
    const n = ac.createBufferSource()
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.06), ac.sampleRate)
    const d = nb.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4
    n.buffer = nb
    const ng = ac.createGain()
    const nf = ac.createBiquadFilter()
    nf.type = 'bandpass'
    nf.frequency.value = surface === 'sand' ? 900 : 700
    ng.gain.setValueAtTime(0.018, ac.currentTime)
    ng.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06)
    n.connect(nf)
    nf.connect(ng)
    ng.connect(ac.destination)
    n.start()
    n.stop(ac.currentTime + 0.07)
  }
}

/** Brief cue when mounting / entering a building. */
export function playInteractSound() {
  const ac = getCtx()
  if (ac.state === 'suspended') void ac.resume()
  playWhoosh(0.05, 320, 0.18)
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(520, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(780, ac.currentTime + 0.1)
  gain.gain.setValueAtTime(0.05, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + 0.25)
}

export function noteInteractPress(pressed: boolean) {
  if (pressed && !lastInteract) playInteractSound()
  lastInteract = pressed
}

/* --- Variometer (muted — kept stubs so callers stay stable) --- */
let varioGain: GainNode | null = null
let varioTimer: number | null = null

/** Climb/sink audio disabled — wind noise covers airspeed feel without beeps. */
export function tickVario(_vs: number, _phase: string, _lift = 0) {
  stopVario()
}

export function stopVario() {
  if (varioGain && ctx) {
    try {
      varioGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05)
    } catch {
      /* */
    }
  }
  if (varioTimer != null) {
    window.clearInterval(varioTimer)
    varioTimer = null
  }
}

