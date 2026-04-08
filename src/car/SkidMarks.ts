import * as THREE from 'three'

const MAX_SEGMENTS = 2000
const FADE_SECONDS = 45.0

interface SkidMark {
  position: THREE.Vector3
  heading: number
  age: number
}

export class SkidMarks {
  private geo: THREE.BufferGeometry
  private mesh: THREE.LineSegments
  private positions: Float32Array
  private alphas: Float32Array
  private marks: SkidMark[] = []
  private ringIndex: number = 0

  constructor() {
    this.positions = new Float32Array(MAX_SEGMENTS * 2 * 3) // 2 verts per segment
    this.alphas = new Float32Array(MAX_SEGMENTS * 2)

    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(0.05, 0.05, 0.05, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    })

    this.mesh = new THREE.LineSegments(this.geo, mat)
    this.mesh.position.y = 0.02 // slight offset above ground
  }

  getMesh(): THREE.Object3D {
    return this.mesh
  }

  update(
    dt: number,
    carPos: THREE.Vector3,
    carHeading: number,
    slipAngle: number,
    forwardSpeed: number
  ): void {
    // Age existing marks
    for (const mark of this.marks) {
      mark.age += dt
    }

    // Remove old marks
    this.marks = this.marks.filter(m => m.age < FADE_SECONDS)

    // Only stamp skid marks when drifting
    const slipMag = Math.abs(slipAngle)
    if (slipMag < 0.08 || Math.abs(forwardSpeed) < 2.0) return

    // Rear wheel positions
    const rear = new THREE.Vector3(Math.sin(carHeading), 0, Math.cos(carHeading))
    const right = new THREE.Vector3(Math.cos(carHeading), 0, -Math.sin(carHeading))

    const wheelOffset = 0.72
    const rearOffset = 1.6

    const leftWheel = carPos.clone()
      .addScaledVector(rear, -rearOffset)
      .addScaledVector(right, -wheelOffset)
    const rightWheel = carPos.clone()
      .addScaledVector(rear, -rearOffset)
      .addScaledVector(right, wheelOffset)

    // Add new mark
    const mark: SkidMark = {
      position: carPos.clone(),
      heading: carHeading,
      age: 0,
    }
    this.marks.push(mark)

    // Ring buffer: stamp 2 vertices per wheel
    const baseIndex = (this.ringIndex % MAX_SEGMENTS) * 6
    const alphaBase = (this.ringIndex % MAX_SEGMENTS) * 2

    this.positions[baseIndex + 0] = leftWheel.x
    this.positions[baseIndex + 1] = 0
    this.positions[baseIndex + 2] = leftWheel.z

    this.positions[baseIndex + 3] = rightWheel.x
    this.positions[baseIndex + 4] = 0
    this.positions[baseIndex + 5] = rightWheel.z

    this.alphas[alphaBase + 0] = 1.0
    this.alphas[alphaBase + 1] = 1.0

    this.ringIndex++

    // Fade old segments
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      if (i * 2 < this.marks.length) {
        const age = this.marks[i]?.age ?? FADE_SECONDS
        const alpha = Math.max(0, 1.0 - age / FADE_SECONDS)
        this.alphas[i * 2] = alpha
        this.alphas[i * 2 + 1] = alpha
      } else {
        this.alphas[i * 2] = 0
        this.alphas[i * 2 + 1] = 0
      }
    }

    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.alpha.needsUpdate = true
  }

  reset(): void {
    this.marks = []
    this.ringIndex = 0
    this.positions.fill(0)
    this.alphas.fill(0)
    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.alpha.needsUpdate = true
  }
}
