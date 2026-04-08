import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

// Vignette shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    offset: { value: 0.8 },
    darkness: { value: 0.6 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * 2.0;
      float vignette = 1.0 - dot(uv, uv) * darkness * 0.3;
      vignette = clamp(vignette, 0.0, 1.0);
      color.rgb *= vignette;
      gl_FragColor = color;
    }
  `,
}

export class PostProcessing {
  composer: EffectComposer

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer)

    const renderPass = new RenderPass(scene, camera)
    this.composer.addPass(renderPass)

    // Bloom for brake lights and emissive elements
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,   // strength — was 0.6, needs to punch through on dark scene
      0.4,   // radius
      0.3    // threshold — was 0.8, lower so dim emissive elements bloom
    )
    this.composer.addPass(bloomPass)

    // Vignette
    const vignettePass = new ShaderPass(VignetteShader)
    this.composer.addPass(vignettePass)
  }

  render(): void {
    this.composer.render()
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }
}
