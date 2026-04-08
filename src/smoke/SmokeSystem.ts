import * as THREE from 'three'

const POOL_SIZE = 800

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uSizeScale;

  attribute vec3 aVelocity;
  attribute float aAge;
  attribute float aMaxAge;
  attribute float aSize;
  attribute float aSeed;

  varying float vLife;
  varying float vSeed;

  // Simplex-style noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float life = clamp(aAge / aMaxAge, 0.0, 1.0);
    vLife = life;
    vSeed = aSeed;

    // Turbulence displacement - swirling motion
    float t = uTime * 0.5;
    vec3 noiseInput = position * 0.5 + vec3(t * 0.3, t * 0.2, t * 0.4);
    float nx = snoise(noiseInput + aSeed * 10.0);
    float ny = snoise(noiseInput + vec3(100.0) + aSeed * 10.0);
    float nz = snoise(noiseInput + vec3(200.0) + aSeed * 10.0);
    vec3 turbulence = vec3(nx, ny, nz) * 0.8 * (1.0 - life);

    // Velocity stretch at high speed
    vec3 velDir = normalize(aVelocity + vec3(0.001));
    vec3 velStretch = velDir * length(aVelocity) * 0.3 * (1.0 - life);

    vec3 pos = position + turbulence + velStretch;

    // Fade: quadratic
    float opacity = pow(1.0 - life, 2.0) * 0.85;

    // Size attenuation
    float size = aSize * (1.0 - life * 0.5) * uSizeScale;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  varying float vLife;
  varying float vSeed;

  void main() {
    float life = vLife;

    // Soft circular falloff
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= 0.85 * pow(1.0 - life, 2.0);

    if (alpha < 0.01) discard;

    // Color: warm white at birth → cool grey at death
    float warmth = (1.0 - life) * 0.15;
    vec3 color = vec3(0.95 - warmth, 0.95 - warmth * 0.5, 0.92);

    gl_FragColor = vec4(color, alpha);
  }
`

export class SmokeSystem {
  private geo: THREE.BufferGeometry
  private mat: THREE.ShaderMaterial
  private points: THREE.Points
  private ringIndex: number = 0

  // Per-particle attributes (GPU-side)
  private positions: Float32Array
  private velocities: Float32Array
  private ages: Float32Array
  private maxAges: Float32Array
  private sizes: Float32Array
  private seeds: Float32Array

  constructor() {
    const count = POOL_SIZE

    this.positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    this.ages = new Float32Array(count)
    this.maxAges = new Float32Array(count)
    this.sizes = new Float32Array(count)
    this.seeds = new Float32Array(count)

    // Init all as dead
    this.maxAges.fill(0.001)
    this.sizes.fill(0)

    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geo.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3))
    this.geo.setAttribute('aAge', new THREE.BufferAttribute(this.ages, 1))
    this.geo.setAttribute('aMaxAge', new THREE.BufferAttribute(this.maxAges, 1))
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    this.geo.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1))

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    this.points = new THREE.Points(this.geo, this.mat)
  }

  getMesh(): THREE.Object3D {
    return this.points
  }

  setTimeUniform(t: number): void {
    this.mat.uniforms['uTime'].value = t
  }

  spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    size: number,
    maxAge: number,
    seed: number
  ): void {
    const i = this.ringIndex % POOL_SIZE
    const i3 = i * 3

    this.positions[i3 + 0] = x
    this.positions[i3 + 1] = y
    this.positions[i3 + 2] = z

    this.velocities[i3 + 0] = vx
    this.velocities[i3 + 1] = vy
    this.velocities[i3 + 2] = vz

    this.ages[i] = 0
    this.maxAges[i] = maxAge
    this.sizes[i] = size
    this.seeds[i] = seed

    this.ringIndex++
  }

  update(dt: number): void {
    // Age all particles
    for (let i = 0; i < POOL_SIZE; i++) {
      if (this.maxAges[i] > 0.001) {
        this.ages[i] += dt
        if (this.ages[i] >= this.maxAges[i]) {
          this.sizes[i] = 0
          this.maxAges[i] = 0.001
        }
      }
    }

    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.aVelocity.needsUpdate = true
    this.geo.attributes.aAge.needsUpdate = true
    this.geo.attributes.aMaxAge.needsUpdate = true
    this.geo.attributes.aSize.needsUpdate = true
    this.geo.attributes.aSeed.needsUpdate = true
  }

  // Spawn smoke from both rear wheels
  emitFromCar(
    carPos: { x: number; z: number },
    carHeading: number,
    slipAngle: number,
    forwardSpeed: number,
    dt: number
  ): void {
    const slipMag = Math.abs(slipAngle)
    if (slipMag < 0.1) return

    const rear = { x: Math.sin(carHeading), z: Math.cos(carHeading) }
    const right = { x: Math.cos(carHeading), z: -Math.sin(carHeading) }
    const wheelOffset = 0.72
    const rearOffset = 1.6

    // Spawn rate scales with slip angle
    const spawnCount = Math.floor(slipMag * 8 * dt * 60)

    for (const side of [-1, 1]) {
      const wx = carPos.x - rear.x * rearOffset + right.x * side * wheelOffset
      const wz = carPos.z - rear.z * rearOffset + right.z * side * wheelOffset

      for (let j = 0; j < spawnCount; j++) {
        const seed = Math.random()
        const maxAge = 2.0 + Math.random() * 2.0
        const size = 8.0 + Math.random() * 12.0

        // Initial velocity: up + slight sideways from car velocity
        const vx = (Math.random() - 0.5) * 1.5 - rear.x * Math.abs(forwardSpeed) * 0.1
        const vy = 0.5 + Math.random() * 1.5
        const vz = (Math.random() - 0.5) * 1.5 - rear.z * Math.abs(forwardSpeed) * 0.1

        this.spawn(wx, 0.15, wz, vx, vy, vz, size, maxAge, seed)
      }
    }
  }
}
