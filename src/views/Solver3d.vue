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
          <label>
            {{ $t('computeMethod') }}
            <select v-model="settings.computeMethod" @change="changeSettings">
              <option value="cpu">{{ $t('CPU') }}</option>
              <option value="vertex">{{ $t('GPU') }}</option>
            </select>
          </label>

          <label>
            {{ $t('detail') }}
            <input type="number" step="1" v-model="settings.detail" @change="changeSettings">
          </label>
        </div>
      </details>

      <details open>
        <summary>{{ $t('menu.pointSources') }}</summary>
        <table>
          <thead>
          <tr>
            <th>{{ $t('serial') }}</th>
            <th>x(&lambda;)</th>
            <th>y(&lambda;)</th>
            <th>z(&lambda;)</th>
            <th>{{ $t('phase') }}(rad)</th>
            <th>{{ $t('operation') }}</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(point, idx) in points" :key="point">
            <td>{{ idx + 1 }}</td>
            <td><input type="number" step="0.1" v-model="point.x"></td>
            <td><input type="number" step="0.1" v-model="point.y"></td>
            <td><input type="number" step="0.1" v-model="point.z"></td>
            <td><input type="number" v-model="point.phase"></td>
            <td><button @click="deletePoint(idx)">{{ $t('delete') }}</button></td>
          </tr>
          <tr>
            <td>{{ points.length + 1 }}</td>
            <td><input type="number" step="0.1" v-model="input.x"></td>
            <td><input type="number" step="0.1" v-model="input.y"></td>
            <td><input type="number" step="0.1" v-model="input.z"></td>
            <td><input type="number" v-model="input.phase"></td>
            <td><button @click="pushPoint">{{ $t('add') }}</button></td>
          </tr>
          </tbody>
        </table>
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
console.debug(width)
const height = width
let scene = new THREE.Scene()
let field
const camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 100)
let renderer = null
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
const defaultData = {
  settings: {
    computeMethod: 'cpu',
    detail: 40
  },
  input: {
    x: 0,
    y: 0,
    z: 0,
    phase: 0
  },
  points: []
}

function loadData (target, data) {
  Object.keys(data).forEach(key => {
    if (defaultData[key] instanceof Object && !Array.isArray(defaultData[key])) {
      loadData(target[key], data[key])
    } else {
      target[key] = data[key]
    }
  })
}

// eslint-disable-next-line no-unused-vars
function dumpData (data) {
  return Object.keys(defaultData).reduce((acc, cur) => {
    if (defaultData[cur] instanceof Object && !Array.isArray(defaultData[cur])) {
      acc[cur] = dumpData(data[cur])
    } else {
      acc[cur] = data[cur]
    }
    return acc
  }, {})
}

export default {
  name: 'Solver3d',
  data () {
    return defaultData
  },
  updated () {
    this.update()
    // stash in 1Hz
    if (stashTimer > 0) {
      clearTimeout(stashTimer)
    }
    stashTimer = setTimeout(this.stash, 5000)
  },
  methods: {
    stash () {
      // FIXME: do not specify key
      localStorage.setItem('array-field-stash-3d', JSON.stringify({
        settings: this.settings,
        input: this.input,
        points: this.points,
        cameraPosition: camera.position
      }))
      console.debug('stashed')
    },
    changeSettings () {
      scene = new THREE.Scene()
      field = new Field(
        this.points.map(v => new PointSource(v.x, v.y, v.z, v.phase)),
        this.settings.detail,
        this.settings.computeMethod
      )
      scene.add(field.mesh)
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
    saveFile () {
      // FIXME
      const file = JSON.stringify({
        settings: this.settings,
        input: this.input,
        points: this.points,
        cameraPosition: camera.position
      })
      const fileBlob = new Blob([file])
      const a = document.createElement('a')
      a.download = 'array-field-3d.json'
      a.href = URL.createObjectURL(fileBlob)
      a.click()
    },
    openFile () {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.multiple = false
      input.onchange = async () => {
        if (input.files.length <= 0) {
          alert(this.$t('alert.noFile'))
          return
        }
        // try parse
        try {
          const fileObject = JSON.parse(await input.files[0].text())
          loadData(this, fileObject)
          camera.position.set(
            fileObject.cameraPosition.x,
            fileObject.cameraPosition.y,
            fileObject.cameraPosition.z
          )
          camera.lookAt(scene.position)
        } catch (e) {
          console.error(e)
          alert(this.$t('alert.errorFile'))
        }
      }
      input.click()
    },
    clear () {
      loadData(this, defaultData)
      this.points = []
      this.stash()
      camera.position.set(0, 0, 1.5)
      camera.lookAt(scene.position)
      console.debug(this.points)
      this.update()
    },
    exportImage (type) {
      if (type === 'png') {
        window.open('about:blank', 'image from canvas')
          .document
          .write(`<img src="${this.$refs.cvs.toDataURL('image/png')}" alt="from canvas">`)
      } else {}
    }
  },
  mounted () {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.$refs.cvs,
      preserveDrawingBuffer: true
    })
    renderer.setSize(width, height)
    renderer.setClearColor(0xffffff, 1)
    controls = new OrbitControls(camera, renderer.domElement)
    const stash = localStorage.getItem('array-field-stash-3d')
    if (stash !== null) {
      try {
        const fileObject = JSON.parse(stash)
        loadData(this, fileObject)
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
    field = new Field(this.points.map(v => new PointSource(v.x, v.y, v.z, v.phase)), this.settings.detail, this.settings.computeMethod)
    scene.add(field.mesh)
    // this.update()
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
  flex-grow: 1;
}

input {
  max-width: 50px;
}

@media screen and (min-width: 768px) {
  input {
    max-width: 80px;
  }
  .panel {
    width: 400px;
    height: 90vh;
  }
}
</style>
