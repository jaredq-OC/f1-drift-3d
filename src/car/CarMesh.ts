import * as THREE from 'three'

export class CarMesh {
  group: THREE.Group
  brakeLights: THREE.Mesh[] = []

  constructor() {
    this.group = new THREE.Group()
    this.buildMesh()
  }

  private buildMesh(): void {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1f,
      metalness: 0.8,
      roughness: 0.3,
    })

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xe03030,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0x800000,
      emissiveIntensity: 0.3,
    })

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.3,
      roughness: 0.5,
    })

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.9,
    })

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.5,
      roughness: 0.5,
    })

    // === Main chassis body ===
    const chassisGeo = new THREE.BoxGeometry(1.0, 0.35, 4.5)
    const chassis = new THREE.Mesh(chassisGeo, bodyMat)
    chassis.position.set(0, 0.35, 0)
    chassis.castShadow = true
    chassis.receiveShadow = true
    this.group.add(chassis)

    // === Nose cone (front taper) ===
    const noseGeo = new THREE.BoxGeometry(0.7, 0.2, 1.5)
    const nose = new THREE.Mesh(noseGeo, bodyMat)
    nose.position.set(0, 0.25, -2.7)
    nose.rotation.x = -0.15
    nose.castShadow = true
    this.group.add(nose)

    // === Front wing ===
    const fwGeo = new THREE.BoxGeometry(2.0, 0.05, 0.4)
    const frontWing = new THREE.Mesh(fwGeo, darkMat)
    frontWing.position.set(0, 0.12, -3.0)
    frontWing.castShadow = true
    this.group.add(frontWing)

    // Front wing end plates
    const ewGeo = new THREE.BoxGeometry(0.05, 0.15, 0.4)
    const ewL = new THREE.Mesh(ewGeo, accentMat)
    ewL.position.set(-0.95, 0.17, -3.0)
    this.group.add(ewL)
    const ewR = ewL.clone()
    ewR.position.set(0.95, 0.17, -3.0)
    this.group.add(ewR)

    // === Rear wing ===
    const rwGeo = new THREE.BoxGeometry(1.4, 0.06, 0.5)
    const rearWing = new THREE.Mesh(rwGeo, darkMat)
    rearWing.position.set(0, 0.9, 2.1)
    rearWing.castShadow = true
    this.group.add(rearWing)

    // Rear wing side plates
    const rwSideGeo = new THREE.BoxGeometry(0.05, 0.45, 0.55)
    const rwSideL = new THREE.Mesh(rwSideGeo, bodyMat)
    rwSideL.position.set(-0.7, 0.7, 2.1)
    this.group.add(rwSideL)
    const rwSideR = rwSideL.clone()
    rwSideR.position.set(0.7, 0.7, 2.1)
    this.group.add(rwSideR)

    // === Airbox / engine cover ===
    const airboxGeo = new THREE.BoxGeometry(0.4, 0.45, 0.6)
    const airbox = new THREE.Mesh(airboxGeo, bodyMat)
    airbox.position.set(0, 0.7, -0.3)
    airbox.castShadow = true
    this.group.add(airbox)

    // === Sidepods ===
    const sidepodGeo = new THREE.BoxGeometry(0.35, 0.3, 1.8)
    const sidepodL = new THREE.Mesh(sidepodGeo, bodyMat)
    sidepodL.position.set(-0.65, 0.3, 0.2)
    sidepodL.castShadow = true
    this.group.add(sidepodL)
    const sidepodR = sidepodL.clone()
    sidepodR.position.set(0.65, 0.3, 0.2)
    this.group.add(sidepodR)

    // === Cockpit halo ===
    const haloGeo = new THREE.TorusGeometry(0.22, 0.03, 8, 16, Math.PI)
    const haloMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
    const halo = new THREE.Mesh(haloGeo, haloMat)
    halo.position.set(0, 0.65, -0.2)
    halo.rotation.x = Math.PI / 2
    halo.rotation.z = Math.PI / 2
    this.group.add(halo)

    // === Wheels (4x) ===
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.28, 16)
    const wheelPositions = [
      [-0.72, 0.32, -1.6, 'FL'],
      [0.72, 0.32, -1.6, 'FR'],
      [-0.72, 0.32, 1.6, 'RL'],
      [0.72, 0.32, 1.6, 'RR'],
    ]

    for (const [x, y, z] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, tireMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x as number, y as number, z as number)
      wheel.castShadow = true
      this.group.add(wheel)

      // Rim accent
      const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 6)
      const rim = new THREE.Mesh(rimGeo, whiteMat)
      rim.rotation.z = Math.PI / 2
      rim.position.set(x as number, y as number, z as number)
      this.group.add(rim)
    }

    // === Brake lights (rear, emissive) ===
    const brakeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.05)
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0xff2020,
      emissive: 0xff0000,
      emissiveIntensity: 0.0,
    })
    const blL = new THREE.Mesh(brakeGeo, brakeMat)
    blL.position.set(-0.45, 0.4, 2.28)
    this.brakeLights.push(blL)
    this.group.add(blL)
    const blR = blL.clone()
    blR.position.set(0.45, 0.4, 2.28)
    this.brakeLights.push(blR)
    this.group.add(blR)

    // === Accent stripes ===
    const stripeGeo = new THREE.BoxGeometry(0.05, 0.02, 3.5)
    const stripeL = new THREE.Mesh(stripeGeo, accentMat)
    stripeL.position.set(-0.52, 0.53, 0)
    this.group.add(stripeL)
    const stripeR = stripeL.clone()
    stripeR.position.set(0.52, 0.53, 0)
    this.group.add(stripeR)

    // Ground shadow plane
    const shadowGeo = new THREE.PlaneGeometry(2.5, 5)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.01
    this.group.add(shadow)
  }

  update(state: { heading: number; position: { x: number; z: number }; throttle: number; handbrake: boolean }): void {
    this.group.position.set(state.position.x, 0, state.position.z)
    this.group.rotation.y = -state.heading

    // Brake lights intensity
    const braking = state.handbrake || state.throttle < 0.05
    const intensity = braking ? 1.5 : 0.0
    for (const bl of this.brakeLights) {
      const mat = bl.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = intensity
    }
  }
}
