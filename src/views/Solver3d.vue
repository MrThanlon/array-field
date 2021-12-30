<template>
  <div>
    <canvas ref="cvs" width="600" height="400"></canvas>
  </div>
</template>

<script>
import * as THREE from 'three'

// eslint-disable-next-line no-unused-vars
function normalSphere (r = 1, phiSamples = 20, thetaSamples = 40) {
  // theta: 0 ~ 2 * Math.PI
  // phi: 0 ~ Math.PI
  const phiStep = Math.PI / (phiSamples - 2)
  const thetaStep = Math.PI * 2 / (thetaSamples - 2)
  const ans = [[0, 0, r], [0, 0, -r]]
  for (let i = 1; i < phiSamples - 1; i++) {
    const rSinPhi = r * Math.sin(i * phiStep)
    const rCosPhi = r * Math.cos(i * phiStep)
    for (let j = 1; j < thetaSamples - 1; j++) {
      ans.push([rSinPhi * Math.cos(j * thetaStep), rSinPhi * Math.sin(j * thetaStep), rCosPhi])
    }
  }
  return ans
}

// eslint-disable-next-line no-unused-vars
function fibonacciSphere (r = 1, samples = 2048) {
  const fib = (Math.sqrt(5) - 1) / 2
  return new Array(samples).fill(0).map((v, i) => {
    const z = (2 * i + 1) / samples - 1
    const tz = Math.sqrt(1 - z ** 2)
    return [tz * Math.cos(2 * Math.PI * (i + 1) * fib) * r, tz * Math.sin(2 * Math.PI * (i + 1) * fib) * r, z * r]
  })
}

export default {
  name: 'Solver3d',
  mounted () {
    new THREE.TextureLoader().load('/disc.png', (texture) => {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000)
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: this.$refs.cvs
      })
      renderer.setSize(600, 400)
      const geometry = new THREE.BufferGeometry().setFromPoints(fibonacciSphere(10).map(v => new THREE.Vector3(v[0], v[1], v[2])))
      const material = new THREE.PointsMaterial({
        size: 1,
        map: texture,
        sizeAttenuation: true,
        alphaTest: 0.5,
        transparent: true
      })
      material.color.setHSL(0.1, 0.5, 0.5)
      const points = new THREE.Points(geometry, material)
      scene.add(points)
      camera.position.z = 20
      camera.position.y = 10
      camera.position.x = 5
      camera.lookAt(scene.position)
      renderer.render(scene, camera)
    })
  }
}
</script>

<style scoped>

</style>
