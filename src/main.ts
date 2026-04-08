import * as THREE from 'three'
import { CarPhysics } from './car/CarPhysics'
import { CarMesh } from './car/CarMesh'
import { SkidMarks } from './car/SkidMarks'
import { SmokeSystem } from './smoke/SmokeSystem'
import { SoundManager } from './audio/SoundManager'
import { TrackManager } from './tracks/TrackManager'
import { ChaseCamera } from './camera/ChaseCamera'
import { PostProcessing } from './postfx/PostProcessing'
import { KeyboardControls } from './controls/KeyboardControls'
import { TouchControls } from './controls/TouchControls'

class F1DriftApp {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: ChaseCamera
  private postProcessing: PostProcessing

  private carPhysics: CarPhysics
  private carMesh: CarMesh
  private skidMarks: SkidMarks
  private smokeSystem: SmokeSystem
  private soundManager: SoundManager
  private trackManager: TrackManager
  private keyboardControls: KeyboardControls
  private touchControls: TouchControls

  private lastTime: number = 0
  private smokeTime: number = 0
  private audioInitialized: boolean = false
  private lastHandbrake: boolean = false

  constructor() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    const container = document.getElementById('canvas-container')
    if (container) container.appendChild(this.renderer.domElement)

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x050510)

    // Camera
    this.camera = new ChaseCamera(window.innerWidth / window.innerHeight)

    // Post-processing
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera.camera)

    // Track
    this.trackManager = new TrackManager(this.scene)

    // Car
    this.carPhysics = new CarPhysics()
    this.carMesh = new CarMesh()
    this.scene.add(this.carMesh.group)

    // Skid marks
    this.skidMarks = new SkidMarks()
    this.scene.add(this.skidMarks.getMesh())

    // Smoke
    this.smokeSystem = new SmokeSystem()
    this.scene.add(this.smokeSystem.getMesh())

    // Sound
    this.soundManager = new SoundManager()

    // Controls
    this.keyboardControls = new KeyboardControls()
    this.touchControls = new TouchControls()

    // Track selector
    this.setupTrackSelector()

    // Resize
    window.addEventListener('resize', this.onResize.bind(this))

    // First interaction → init audio
    const initAudio = () => {
      if (!this.audioInitialized) {
        this.soundManager.init()
        this.audioInitialized = true
      }
      document.removeEventListener('click', initAudio)
      document.removeEventListener('touchstart', initAudio)
    }
    document.addEventListener('click', initAudio)
    document.addEventListener('touchstart', initAudio)
  }

  private setupTrackSelector(): void {
    const buttons = document.querySelectorAll('.track-btn')
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const trackId = (btn as HTMLElement).dataset['track']
        if (trackId) {
          this.trackManager.setTrack(trackId)
          buttons.forEach(b => b.classList.remove('active'))
          btn.classList.add('active')
        }
      })
    })
  }

  private onResize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h)
    this.camera.resize(w / h)
    this.postProcessing.resize(w, h)
  }

  private updateControls(): void {
    this.keyboardControls.update()
    this.touchControls.update()

    const kb = this.keyboardControls.state
    const tc = this.touchControls.state

    // Keyboard takes priority if actively pressed
    const hasKbInput = kb.throttle > 0 || kb.brake > 0 || kb.steer !== 0 || kb.handbrake
    const hasTcInput = tc.throttle > 0 || tc.brake > 0 || tc.steer !== 0 || tc.handbrake

    if (hasKbInput) {
      this.carPhysics.setGasBrake(kb.throttle, kb.brake)
      this.carPhysics.setSteer(kb.steer)
      this.carPhysics.setHandbrake(kb.handbrake)
    } else if (hasTcInput) {
      this.carPhysics.setGasBrake(tc.throttle, tc.brake)
      this.carPhysics.setSteer(tc.steer)
      this.carPhysics.setHandbrake(tc.handbrake)
    } else {
      this.carPhysics.setGasBrake(0, 0)
      this.carPhysics.setSteer(0)
      this.carPhysics.setHandbrake(false)
    }

    // Sound manager muted state
    if (kb.muted !== this.soundManager.isMuted()) {
      this.soundManager.setMuted(kb.muted)
    }
  }

  private animate(time: number): void {
    requestAnimationFrame(this.animate.bind(this))

    const dt = Math.min((time - this.lastTime) / 1000, 0.05) // clamp to 50ms
    this.lastTime = time
    this.smokeTime += dt

    // Controls
    this.updateControls()

    // Physics
    this.carPhysics.update(dt)

    // Sound
    const s = this.carPhysics.state
    this.soundManager.update(s.forwardSpeed, s.slipAngle, s.throttle, s.handbrake)

    // Handbrake sound stamp
    if (s.handbrake && !this.lastHandbrake) {
      this.soundManager.playHandbrakeStamp()
    }
    this.lastHandbrake = s.handbrake

    // Car mesh
    this.carMesh.update({
      heading: s.heading,
      position: { x: s.position.x, z: s.position.z },
      throttle: s.throttle,
      handbrake: s.handbrake,
    })

    // Skid marks
    this.skidMarks.update(
      dt,
      s.position,
      s.heading,
      s.slipAngle,
      s.forwardSpeed
    )

    // Smoke
    this.smokeSystem.setTimeUniform(this.smokeTime)
    this.smokeSystem.emitFromCar(
      { x: s.position.x, z: s.position.z },
      s.heading,
      s.slipAngle,
      s.forwardSpeed,
      dt
    )
    this.smokeSystem.update(dt)

    // Camera
    this.camera.update(
      s.position,
      s.heading,
      s.slipAngle,
      dt
    )

    // Render
    this.postProcessing.render()
  }

  start(): void {
    this.lastTime = performance.now()
    requestAnimationFrame(this.animate.bind(this))
  }
}

// Boot
const app = new F1DriftApp()
app.start()
