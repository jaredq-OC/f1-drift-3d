import * as THREE from 'three'

export class ChaseCamera {
  camera: THREE.PerspectiveCamera
  private currentPos: THREE.Vector3 = new THREE.Vector3(0, 5, 10)
  private currentLook: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private readonly dist: number = 5
  private readonly height: number = 2.5
  private readonly lookAhead: number = 3

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000)
    this.camera.position.copy(this.currentPos)
  }

  update(
    carPos: THREE.Vector3,
    carHeading: number,
    slipAngle: number,
    dt: number
  ): void {
    const fwd = new THREE.Vector3(Math.sin(carHeading), 0, Math.cos(carHeading))

    // Dynamic distance based on slip
    const slipMag = Math.abs(slipAngle)
    const dynamicDist = slipMag > 0.2 ? this.dist * 1.3 : this.dist
    const dynamicHeight = slipMag > 0.2 ? this.height * 1.15 : this.height

    // Side offset when drifting
    const sideOffset = slipMag > 0.2 ? Math.sin(carHeading) * 1.2 : 0

    const desiredPos = carPos.clone()
      .addScaledVector(fwd, -dynamicDist)
      .add(new THREE.Vector3(sideOffset, dynamicHeight, 0))

    // Smooth lerp (cinematic lag)
    const posAlpha = 1.0 - Math.pow(0.05, dt)
    this.currentPos.lerp(desiredPos, posAlpha)

    // Look target: slightly ahead of car
    const lookTarget = carPos.clone().addScaledVector(fwd, this.lookAhead)

    // Smooth look
    const lookAlpha = 1.0 - Math.pow(0.08, dt)
    this.currentLook.lerp(lookTarget, lookAlpha)

    this.camera.position.copy(this.currentPos)
    this.camera.lookAt(this.currentLook)
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }
}
