export interface TouchState {
  steer: number      // -1 to 1
  throttle: number   // 0 to 1 (gas)
  brake: number      // 0 to 1
  handbrake: boolean
}

const DEAD_ZONE = 8  // pixels

export class TouchControls {
  state: TouchState = { steer: 0, throttle: 0, brake: 0, handbrake: false }
  private joystickInner: HTMLElement | null = null
  private handbrakeBtn: HTMLElement | null = null
  private joystickTouchId: number | null = null
  private hbTouchId: number | null = null
  private joystickCenter: { x: number; y: number } = { x: 0, y: 0 }

  constructor() {
    this.joystickInner = document.getElementById('joystick-inner')
    this.handbrakeBtn = document.getElementById('handbrake-btn')

    this.setupJoystick()
    this.setupHandbrake()
    this.setupTouchDetection()
  }

  private setupJoystick(): void {
    const outer = document.getElementById('joystick-outer')
    if (!outer) return

    outer.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (this.joystickTouchId !== null) return
      const touch = e.changedTouches[0]
      this.joystickTouchId = touch.identifier
      const rect = outer.getBoundingClientRect()
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
      this.updateJoystick(touch.clientX, touch.clientY)
    }, { passive: false })

    document.addEventListener('touchmove', (e) => {
      if (this.joystickTouchId === null) return
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joystickTouchId) {
          e.preventDefault()
          this.updateJoystick(touch.clientX, touch.clientY)
        }
      }
    }, { passive: false })

    document.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null
          this.resetJoystick()
        }
      }
    })
  }

  private updateJoystick(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickCenter.x
    const dy = clientY - this.joystickCenter.y

    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = 40 // half of 80 (outer radius)

    // Apply dead zone
    if (dist < DEAD_ZONE) {
      this.state.steer = 0
      this.state.throttle = 0
      this.state.brake = 0
      this.moveKnob(0, 0)
      return
    }

    const clampedDist = Math.min(dist, maxDist)
    const normX = dx / dist
    const normY = dy / dist

    // Position knob
    this.moveKnob(normX * clampedDist, normY * clampedDist)

    // Normalize to [-1, 1] for steer, [0, 1] for gas/brake
    this.state.steer = normX * (clampedDist / maxDist)
    // Up (negative dy) = forward = gas, down (positive dy) = brake
    const normDY = -normY * (clampedDist / maxDist)
    if (normDY > 0) {
      this.state.throttle = normDY
      this.state.brake = 0
    } else {
      this.state.throttle = 0
      this.state.brake = -normDY
    }
  }

  private moveKnob(x: number, y: number): void {
    if (!this.joystickInner) return
    const outer = document.getElementById('joystick-outer')
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    this.joystickInner.style.left = `${centerX + x - 22}px`
    this.joystickInner.style.top = `${centerY + y - 22}px`
    this.joystickInner.style.transform = 'none'
  }

  private resetJoystick(): void {
    this.state.steer = 0
    this.state.throttle = 0
    this.state.brake = 0
    if (this.joystickInner) {
      this.joystickInner.style.left = '50%'
      this.joystickInner.style.top = '50%'
      this.joystickInner.style.transform = 'translate(-50%, -50%)'
    }
  }

  private setupHandbrake(): void {
    if (!this.handbrakeBtn) return

    this.handbrakeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (this.hbTouchId !== null) return
      const touch = e.changedTouches[0]
      this.hbTouchId = touch.identifier
      this.state.handbrake = true
      this.handbrakeBtn!.classList.add('active')
    }, { passive: false })

    document.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.hbTouchId) {
          this.hbTouchId = null
          this.state.handbrake = false
          this.handbrakeBtn!.classList.remove('active')
        }
      }
    })
  }

  private setupTouchDetection(): void {
    // Detect touch capability and show/hide controls
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (hasTouch) {
      document.getElementById('app')?.classList.add('touch-active')
    }
  }

  update(): void {
    // State is updated by event handlers
  }

  isHandbrakePressed(): boolean {
    return this.state.handbrake
  }

  wasHandbrakeJustPressed(): boolean {
    return false // tracking handled externally
  }
}
