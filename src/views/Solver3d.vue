<template>
  <div style="display: flex;justify-content: center;flex-wrap: wrap;">
    <canvas ref="cvs" style="border: black 1px solid" @mouseup="stash">
    </canvas>
    <div class="panel">
      <details open>
        <summary>{{ $t('menu.files') }}</summary>
        <div style="display: flex;flex-wrap: wrap;justify-content: space-between">
          <button @click="saveFile">{{ $t('saveFile') }}</button>
          <button @click="openFile">{{ $t('openFile') }}</button>
          <button @click="clear">{{ $t('clear') }}</button>
          <button @click="exportImage('png')">{{ $t('exportPNG') }}</button>
        </div>
      </details>

      <details open>
        <summary>{{ $t('menu.settings') }}</summary>
        <div style="display: flex;justify-content: space-between;flex-wrap: wrap">
        </div>
      </details>

      <details open>
        <summary>{{ $t('menu.pointSources') }}</summary>
        <ul>
          <li v-for="(point, idx) in points" :key="point">
            <p>x: <input type="number" step="0.1" v-model="point.x"> &lambda;</p>
            <p>y: <input type="number" step="0.1" v-model="point.y"> &lambda;</p>
            <p>z: <input type="number" step="0.1" v-model="point.z"> &lambda;</p>
            <p>{{ $t('phase') }}: <input type="number" v-model="point.phase"> rad</p>
            <p>
              <button @click="deletePoint(idx)">{{ $t('delete') }}</button>
            </p>
          </li>
          <li>
            <p>x: <input type="number" step="0.1" v-model="input.x"> &lambda;</p>
            <p>y: <input type="number" step="0.1" v-model="input.y"> &lambda;</p>
            <p>z: <input type="number" step="0.1" v-model="input.z"> &lambda;</p>
            <p>{{ $t('phase') }}: <input type="number" v-model="input.phase"> rad</p>
            <p>
              <button @click="pushPoint">
                {{ $t('add') }}
              </button>
            </p>
          </li>
        </ul>
      </details>

      <details open>
        <summary>{{ $t('menu.inverseSolvePhase') }}</summary>
      </details>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Field, PointSource } from '../utils/calculate3d'

const width = Math.max(window.innerWidth / 2, 768 / 2)
const height = width
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 100)
let renderer = null
// let geometry = new THREE.IcosahedronGeometry(1, 3)
const field = new Field([], 40, 'vertex')
scene.add(field.mesh)
const pointsGeometry = new THREE.BufferGeometry()
const pointMaterial = new THREE.PointsMaterial({
  size: 0.1,
  map: null,
  sizeAttenuation: true,
  alphaTest: 0.5,
  transparent: true
})
scene.add(new THREE.Points(pointsGeometry, pointMaterial))
let controls = null
let stashTimer = -1

export default {
  name: 'Solver3d',
  data () {
    return {
      settings: {
      },
      input: {
        x: 0,
        y: 0,
        z: 0,
        phase: 0
      },
      points: []
    }
  },
  beforeUpdate () {
    // stash in 1Hz
    if (stashTimer > 0) {
      clearTimeout(stashTimer)
    }
    stashTimer = setTimeout(this.stash, 1000)
  },
  methods: {
    stash () {
      localStorage.setItem('array-field-stash-3d', JSON.stringify({
        settings: this.settings,
        input: this.input,
        points: this.points,
        cameraPosition: camera.position
      }))
      console.debug('stashed')
    },
    update () {
      field.updatePoints(this.points.map(v => new PointSource(v.x, v.y, v.z, v.phase)))
    },
    pushPoint () {
      this.points.push({
        x: parseFloat(this.input.x),
        y: parseFloat(this.input.y),
        z: parseFloat(this.input.z),
        phase: parseFloat(this.input.phase)
      })
      this.update()
      this.input = {
        x: 0,
        y: 0,
        z: 0,
        phase: 0
      }
    },
    deletePoint (idx) {
      this.points.splice(idx, 1)
      this.update()
    },
    saveFile () {},
    openFile () {},
    clear () {
      this.points = []
      camera.position.set(0, 0, 1.5)
      camera.lookAt(scene.position)
      this.update()
    },
    exportImage (type) {}
  },
  mounted () {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.$refs.cvs
    })
    renderer.setSize(width, height)
    renderer.setClearColor(0xffffff, 1)
    controls = new OrbitControls(camera, renderer.domElement)
    const stash = localStorage.getItem('array-field-stash-3d')
    if (stash !== null) {
      try {
        const fileObject = JSON.parse(stash)
        this.settings = fileObject.settings
        this.input = fileObject.input
        this.points = fileObject.points
        camera.position.set(
          fileObject.cameraPosition.x,
          fileObject.cameraPosition.y,
          fileObject.cameraPosition.z
        )
        camera.lookAt(scene.position)
      } catch (e) {
        console.error(e)
      }
    } else {
      camera.position.set(0, 0, 1.5)
      camera.lookAt(scene.position)
    }
    this.update()
    controls.minDistance = 1.2
    controls.maxDistance = 3
    controls.zoomSpeed = 0.1
    controls.update()
    new THREE.TextureLoader().load('/disc.png', (texture) => {
    })
    renderer.render(scene, camera)
    function animate () {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
  }
}
</script>

<style scoped>
p {
  margin: 0;
  padding: 0;
}

.panel {
  width: 100%;
  height: 30vh;
  overflow-y: scroll;
  padding: 3px;
}

@media screen and (min-width: 768px) {
  .panel {
    width: 400px;
    height: 90vh;
  }
}
</style>
