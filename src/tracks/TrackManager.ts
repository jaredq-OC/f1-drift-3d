import * as THREE from 'three'

export interface TrackConfig {
  id: string
  name: string
  groundColor: number
  fogColor: number
  fogDensity: number
  skyColorTop: number
  skyColorHorizon: number
  ambientIntensity: number
  spotlightColor: number
  spotlightIntensity: number
  spotlightPos: [number, number, number]
}

export const TRACKS: Record<string, TrackConfig> = {
  night: {
    id: 'night',
    name: 'Night Circuit',
    groundColor: 0x686888,
    fogColor: 0x0a0a20,
    fogDensity: 0.0008,
    skyColorTop: 0x050510,
    skyColorHorizon: 0x1a0a30,
    ambientIntensity: 1.8,
    spotlightColor: 0xaaaaff,
    spotlightIntensity: 20.0,
    spotlightPos: [0, 30, 0],
  },
  dusk: {
    id: 'dusk',
    name: 'Dusk Highway',
    groundColor: 0x5a4a40,
    fogColor: 0x2a1810,
    fogDensity: 0.003,
    skyColorTop: 0x1a0a20,
    skyColorHorizon: 0xff6030,
    ambientIntensity: 0.8,
    spotlightColor: 0xffaa55,
    spotlightIntensity: 6.0,
    spotlightPos: [0, 25, 0],
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial Zone',
    groundColor: 0x585858,
    fogColor: 0x201510,
    fogDensity: 0.005,
    skyColorTop: 0x101010,
    skyColorHorizon: 0x3a2a10,
    ambientIntensity: 0.7,
    spotlightColor: 0xff8844,
    spotlightIntensity: 6.0,
    spotlightPos: [0, 22, 0],
  },
}

export class TrackManager {
  private currentTrackId: string = 'night'
  private groundMesh: THREE.Mesh | null = null
  private fog: THREE.FogExp2 | null = null
  private ambientLight: THREE.AmbientLight | null = null
  private spotlight: THREE.SpotLight | null = null
  private skyMesh: THREE.Mesh | null = null
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.buildTrack(TRACKS.night)
  }

  private buildTrack(config: TrackConfig): void {
    // Remove old objects
    if (this.groundMesh) this.scene.remove(this.groundMesh)
    if (this.skyMesh) this.scene.remove(this.skyMesh)

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(800, 800)
    const groundMat = new THREE.MeshStandardMaterial({
      color: config.groundColor,
      roughness: 0.85,
      metalness: 0.1,
    })
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat)
    this.groundMesh.rotation.x = -Math.PI / 2
    this.groundMesh.receiveShadow = true
    this.scene.add(this.groundMesh)

    // Grid lines on ground — subtle reference grid, not dominant
    const gridHelper = new THREE.GridHelper(400, 20, 0x8888bb, 0x555577)
    gridHelper.position.y = 0.01
    this.scene.add(gridHelper)

    // Fog
    this.fog = new THREE.FogExp2(config.fogColor, config.fogDensity)
    this.scene.fog = this.fog

    // Ambient light
    if (this.ambientLight) this.scene.remove(this.ambientLight)
    this.ambientLight = new THREE.AmbientLight(0xffffff, config.ambientIntensity)
    this.scene.add(this.ambientLight)

    // Spotlight
    if (this.spotlight) this.scene.remove(this.spotlight)
    this.spotlight = new THREE.SpotLight(
      config.spotlightColor,
      config.spotlightIntensity,
      0,
      Math.PI / 6,
      0.3,
      1.0
    )
    this.spotlight.position.set(...config.spotlightPos)
    this.spotlight.target.position.set(0, 0, 0)
    this.spotlight.castShadow = true
    this.spotlight.shadow.mapSize.width = 1024
    this.spotlight.shadow.mapSize.height = 1024
    this.scene.add(this.spotlight)
    this.scene.add(this.spotlight.target)

    // Sky gradient (large sphere)
    const skyGeo = new THREE.SphereGeometry(500, 32, 16)
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTopColor: { value: new THREE.Color(config.skyColorTop) },
        uHorizonColor: { value: new THREE.Color(config.skyColorHorizon) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = max(0.0, h);
          gl_FragColor = vec4(mix(uHorizonColor, uTopColor, t), 1.0);
        }
      `,
    })
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat)
    this.scene.add(this.skyMesh)

    // Hemisphere light — sky/ground ambient for better base illumination
    const hemiLight = new THREE.HemisphereLight(0x2222aa, 0x0a0a20, 1.0)
    this.scene.add(hemiLight)
  }

  setTrack(id: string): void {
    if (!TRACKS[id]) return
    this.currentTrackId = id
    this.buildTrack(TRACKS[id])
  }

  getCurrentTrackId(): string {
    return this.currentTrackId
  }
}
