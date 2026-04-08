export interface ControlsState {
  throttle: number    // 0–1
  brake: number       // 0–1
  steer: number       // -1 to 1
  handbrake: boolean
  muted: boolean
}

type KeyState = { pressed: boolean }

export class KeyboardControls {
  private keys: Map<string, KeyState> = new Map()
  state: ControlsState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    muted: false,
  }
  private _muted: boolean = false

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault()
    }
    if (e.code === 'KeyM') {
      this._muted = !this._muted
      this.state.muted = this._muted
      return
    }
    const entry = this.keys.get(e.code) ?? { pressed: false }
    entry.pressed = true
    this.keys.set(e.code, entry)
  }

  private onKeyUp(e: KeyboardEvent): void {
    const entry = this.keys.get(e.code)
    if (entry) entry.pressed = false
  }

  private isPressed(code: string): boolean {
    return this.keys.get(code)?.pressed ?? false
  }

  update(): void {
    const w = this.isPressed('KeyW') ? 1 : 0
    const s = this.isPressed('KeyS') ? 1 : 0
    this.state.throttle = w
    this.state.brake = s
    this.state.steer = (this.isPressed('KeyA') ? 1 : 0) - (this.isPressed('KeyD') ? 1 : 0)
    this.state.handbrake = this.isPressed('Space')
    this.state.muted = this._muted
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this))
    window.removeEventListener('keyup', this.onKeyUp.bind(this))
  }
}
