import * as THREE from 'three'

// Drift physics state
export interface CarState {
  position: THREE.Vector3
  velocity: THREE.Vector3    // world-space velocity
  heading: number             // yaw angle in radians
  angularVelocity: number
  throttle: number            // 0–1
  steerAngle: number          // -1 to 1
  handbrake: boolean
  slipAngle: number           // computed
  forwardSpeed: number         // computed
}

// Physics constants (from architecture.md)
const PHYSICS = {
  maxGrip: 0.85,
  minGrip: 0.15,
  maxSlip: 0.35,          // radians
  engineForce: 0.8,
  brakeForce: 0.6,
  handbrakeRearGrip: 0.0,
  momentOfInertia: 1.0,
  lateralDamping: 0.98,
  wheelbase: 1.5,         // fictional F1 wheelbase
  maxSpeed: 50,
  airResistance: 0.001,
}

export class CarPhysics {
  state: CarState
  private _throttle: number = 0
  private _brake: number = 0
  private _steer: number = 0
  private _handbrake: boolean = false

  constructor() {
    this.state = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      heading: 0,
      angularVelocity: 0,
      throttle: 0,
      steerAngle: 0,
      handbrake: false,
      slipAngle: 0,
      forwardSpeed: 0,
    }
  }

  // Input setters
  setThrottle(t: number) { this._throttle = Math.max(0, Math.min(1, t)) }
  setBrake(b: number) { this._brake = Math.max(0, Math.min(1, b)) }
  setSteer(s: number) { this._steer = Math.max(-1, Math.min(1, s)) }
  setHandbrake(h: boolean) { this._handbrake = h }

  // Combined gas+brake input (from touch: negative Y = forward)
  setGasBrake(gas: number, brake: number) {
    this._throttle = Math.max(0, Math.min(1, gas))
    this._brake = Math.max(0, Math.min(1, brake))
  }

  // World-space helpers
  get forward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.state.heading), 0, Math.cos(this.state.heading))
  }

  get right(): THREE.Vector3 {
    return new THREE.Vector3(Math.cos(this.state.heading), 0, -Math.sin(this.state.heading))
  }

  update(dt: number): void {
    const s = this.state
    const fwd = this.forward

    // Decompose velocity into forward + lateral components
    const forwardSpeed = s.velocity.dot(fwd)
    const lateralSpeed = s.velocity.dot(this.right)

    // Slip angle
    const absFwd = Math.abs(forwardSpeed)
    const slipAngle = Math.atan2(lateralSpeed, absFwd + 0.001)
    s.slipAngle = slipAngle
    s.forwardSpeed = forwardSpeed

    // Rear grip calculation
    let rearGrip: number
    if (this._handbrake) {
      rearGrip = PHYSICS.handbrakeRearGrip
    } else {
      rearGrip = THREE.MathUtils.lerp(
        PHYSICS.maxGrip,
        PHYSICS.minGrip,
        Math.min(Math.abs(slipAngle) / PHYSICS.maxSlip, 1.0)
      )
    }

    // Lateral force (opposes lateral sliding)
    const lateralForce = rearGrip * lateralSpeed

    // Drive force
    const driveForce = this._throttle * PHYSICS.engineForce

    // Brake force
    const brakeForce = this._brake * PHYSICS.brakeForce

    // Angular acceleration from rear lateral force * wheelbase / inertia * steer
    const angularAccel = (lateralForce * PHYSICS.wheelbase) / PHYSICS.momentOfInertia * this._steer

    // Air resistance (speed-dependent drag)
    const speed = s.velocity.length()
    const airDrag = speed * speed * PHYSICS.airResistance

    // Apply forces
    // Forward: drive force minus brake and air resistance
    let forwardAccel = driveForce - brakeForce * Math.sign(forwardSpeed)
    if (forwardSpeed > 0.1) {
      forwardAccel -= airDrag
    }

    // Lateral damping
    let lateralAccel = -lateralForce * (1.0 - rearGrip) * 2.0

    // Angular
    const angularAcc = angularAccel * (1.0 - Math.abs(this._steer) * 0.3)

    // Integrate
    s.angularVelocity = s.angularVelocity * 0.95 + angularAcc * dt
    s.heading += s.angularVelocity * dt

    // Update velocity direction based on new heading
    const newFwd = this.forward
    const newRight = this.right

    // Forward component
    const newForwardSpeed = forwardSpeed + forwardAccel * dt
    // Lateral component (grip-dependent)
    const newLateralSpeed = lateralSpeed * PHYSICS.lateralDamping + lateralAccel * dt

    s.velocity.copy(newFwd.multiplyScalar(newForwardSpeed))
    s.velocity.add(newRight.multiplyScalar(newLateralSpeed))

    // Clamp max speed
    const currentSpeed = s.velocity.length()
    if (currentSpeed > PHYSICS.maxSpeed) {
      s.velocity.multiplyScalar(PHYSICS.maxSpeed / currentSpeed)
    }

    // Integrate position
    s.position.add(s.velocity.clone().multiplyScalar(dt))

    // Update state for input
    s.throttle = this._throttle
    s.steerAngle = this._steer
    s.handbrake = this._handbrake
  }

  // Reset car to origin with given heading
  reset(heading: number = 0): void {
    this.state.position.set(0, 0, 0)
    this.state.velocity.set(0, 0, 0)
    this.state.heading = heading
    this.state.angularVelocity = 0
    this._throttle = 0
    this._brake = 0
    this._steer = 0
    this._handbrake = false
  }
}
