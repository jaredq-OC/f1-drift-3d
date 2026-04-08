export class SoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private engineOsc: OscillatorNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  private engineGain: GainNode | null = null
  private tireNoise: AudioBufferSourceNode | null = null
  private tireFilter: BiquadFilterNode | null = null
  private tireGain: GainNode | null = null
  private muted: boolean = false
  private _initialized: boolean = false

  init(): void {
    if (this._initialized) return
    this._initialized = true

    this.ctx = new AudioContext()

    // Master gain
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.7
    this.masterGain.connect(this.ctx.destination)

    // Engine: sawtooth oscillator → lowpass filter → gain
    this.engineOsc = this.ctx.createOscillator()
    this.engineOsc.type = 'sawtooth'
    this.engineOsc.frequency.value = 60

    this.engineFilter = this.ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 200
    this.engineFilter.Q.value = 1.0

    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.value = 0.08

    this.engineOsc.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.masterGain)
    this.engineOsc.start()

    // Tire screech: white noise buffer → highpass filter → gain
    const bufferSize = this.ctx.sampleRate * 2
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    this.tireNoise = this.ctx.createBufferSource()
    this.tireNoise.buffer = noiseBuffer
    this.tireNoise.loop = true

    this.tireFilter = this.ctx.createBiquadFilter()
    this.tireFilter.type = 'highpass'
    this.tireFilter.frequency.value = 2800
    this.tireFilter.Q.value = 0.5

    this.tireGain = this.ctx.createGain()
    this.tireGain.gain.value = 0

    this.tireNoise.connect(this.tireFilter)
    this.tireFilter.connect(this.tireGain)
    this.tireGain.connect(this.masterGain)
    this.tireNoise.start()
  }

  update(
    forwardSpeed: number,
    slipAngle: number,
    throttle: number,
    _handbrake: boolean
  ): void {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain || !this.tireGain) return
    if (this.muted) return

    const speed = Math.abs(forwardSpeed)

    // Engine: frequency tracks speed
    const baseFreq = 60 + speed * 3.5
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1)

    // Filter cutoff tracks RPM
    const cutoff = 200 + speed * 20
    this.engineFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.1)

    // Engine gain: idle to full throttle
    const targetGain = 0.06 + throttle * 0.12
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05)

    // Tire screech: proportional to slip angle
    const slipMag = Math.abs(slipAngle)
    const maxSlip = 0.35
    const tireTarget = slipMag > 0.05 ? Math.min(slipMag / maxSlip, 1.0) * 0.22 : 0
    this.tireGain.gain.setTargetAtTime(tireTarget, this.ctx.currentTime, 0.08)
  }

  playHandbrakeStamp(): void {
    if (!this.ctx || !this.masterGain || this.muted) return

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15))
    }

    const source = this.ctx.createBufferSource()
    source.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 3000
    filter.Q.value = 0.8

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, this.ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    source.start()
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (this.masterGain) {
      this.masterGain.gain.value = m ? 0 : 0.7
    }
  }

  isInitialized(): boolean {
    return this._initialized
  }

  isMuted(): boolean {
    return this.muted
  }
}
