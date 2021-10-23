<template>
  <div id="home">
    <div id="svg" class="graph" ref="graph">
    </div>
    <div class="panel" ref="panel">
      <div class="panel-body">
        <details open>
          <summary>{{ $t('menu.files') }}</summary>
          <div style="display: flex;flex-wrap: wrap;justify-content: space-between">
            <button @click="saveFile">{{ $t('saveFile') }}</button>
            <button @click="openFile">{{ $t('openFile') }}</button>
            <button @click="clear">{{ $t('clear') }}</button>
            <button @click="exportImage('svg')">{{ $t('exportImage') }}</button>
            <button @click="exportImage('png')">{{ $t('exportPNG') }}</button>
          </div>
        </details>
        <details open>
          <summary>{{ $t('menu.views') }}</summary>
          <div style="display: flex;justify-content: space-between;flex-wrap: wrap">
            <label>
              {{ $t('directivity') }}
              <input type="checkbox"
                     v-model="views.directivity"
                     @change="directivityPath.attr('style',views.directivity?'':'display: none')">
            </label>
            <label>
              {{ $t('directivityAxis') }}
              <input type="checkbox"
                     v-model="views.polarAxis"
                     @change="polarAxis.attr('style',views.polarAxis?'':'display: none')">
            </label>
            <label>
              {{ $t('point') }}
              <input type="checkbox"
                     v-model="views.points"
                     @change="pointsPath.attr('style',views.points?'':'display: none')">
            </label>
            <label>
              {{ $t('pointAxis') }}
              <input type="checkbox"
                     v-model="views.cartesianAxis"
                     @change="cartesianAxis.attr('style',views.cartesianAxis?'':'display: none')">
            </label>
          </div>
        </details>
        <details open>
          <summary>{{ $t('menu.pointSources') }}</summary>
          <ul style="">
            <li v-for="(item, idx) in pointsInput"
                :key="item"
                style="cursor: pointer"
                :class="{selected:cursorFunction==='point'&&pointSelect===idx}"
                @click="cursorFunction='point';pointSelect=idx">
              <p>x: <input type="number" step="0.1" v-model="item.x" @input="updateDraw"> &lambda;</p>
              <p>y: <input type="number" step="0.1" v-model="item.y" @input="updateDraw"> &lambda;</p>
              <p>{{ $t('phase') }}: <input type="number" v-model="item.phase" @input="updateDraw"> rad</p>
              <p><button @click="deletePoint(idx)">{{ $t('delete') }}</button></p>
            </li>
            <li @click="cursorFunction='point';pointSelect=-1"
                style="cursor: pointer"
                :class="{selected:cursorFunction==='point'&&pointSelect===-1}">
              <p>x: <input type="number" step="0.1" v-model="xInput"> &lambda;</p>
              <p>y: <input type="number" step="0.1" v-model="yInput"> &lambda;</p>
              <p>{{ $t('phase') }}: <input type="number" v-model="phaseInput"> rad</p>
              <p>
                <button @click="pushPoint(parseFloat(xInput),parseFloat(yInput),parseFloat(phaseInput))">
                  {{ $t('add') }}
                </button>
              </p>
            </li>
          </ul>
        </details>
        <details open>
          <summary>{{ $t('menu.inverseSolvePhase') }}</summary>
          <div>
            <label @click="cursorFunction='phi'" :class="{selected: cursorFunction==='phi'}" style="cursor: pointer">
              phi:&nbsp;
              <input type="number" step="0.1" min="0" max="6.3" v-model="phiInput" @input="inverseSolvePhase">
              &nbsp;rad
            </label>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script>
import { Field, PointSource } from '../utils/calculate'
import * as d3 from 'd3'

let xDirScale
let yDirScale
let dirScale
let xPointScale
let yPointScale
let field
let cursorEle
let stashTimer = -1

export default {
  name: 'Home',
  data () {
    return {
      svg: null,
      directivityPath: null,
      pointsPath: null,
      cartesianAxis: null,
      polarAxis: null,
      views: {
        points: true,
        directivity: true,
        cartesianAxis: true,
        polarAxis: true
      },
      cursorFunction: 'point',
      pointSelect: -1,
      mouseDown: false,
      borderLength: 0,
      pointsInput: [],
      xInput: 0,
      yInput: 0,
      phaseInput: 0,
      phiInput: 0
    }
  },
  methods: {
    draw () {
      const path = d3.path()
      // draw directivity
      path.moveTo(xDirScale(field.rs[0]), yDirScale(0))
      for (let i = 1; i < field.rs.length; i++) {
        path.lineTo(xDirScale(field.rs[i] * Math.cos(i * field.dphi)),
          yDirScale(field.rs[i] * Math.sin(i * field.dphi)))
      }
      path.closePath()
      this.directivityPath.attr('d', path)
      // draw points
      const points = d3.path()
      field.points.forEach(point => {
        points.arc(
          xPointScale(point.dr / Math.PI / 2 * Math.cos(point.theta)),
          yPointScale(point.dr / Math.PI / 2 * Math.sin(point.theta)),
          5, 0, Math.PI * 2)
        points.closePath()
      })
      this.pointsPath.attr('d', points)
    },
    inverseSolvePhase () {
      const phi = parseFloat(this.phiInput)
      console.debug(phi)
      field.inverseSolvePhase(phi)
      field.points.forEach(({ phase }, idx) => {
        this.pointsInput[idx].phase = phase % (2 * Math.PI)
      })
      this.updateDraw()
    },
    updateDraw () {
      // do draw
      field = new Field(this.pointsInput.map(({ x, y, phase }) => {
        return PointSource.fromCartesian(x, y, phase)
      }))
      this.draw()
    },
    pushPoint (x, y, phase) {
      this.pointsInput.push({ x, y, phase })
      this.updateDraw()
    },
    deletePoint (idx) {
      this.pointsInput.splice(idx, 1)
      this.updateDraw()
    },
    // UX
    saveFile () {
      const file = JSON.stringify({
        views: this.views,
        pointsInput: this.pointsInput,
        cursorFunction: this.cursorFunction,
        pointSelect: this.pointSelect
      })
      const fileBlob = new Blob([file])
      const a = document.createElement('a')
      a.download = 'array-field.json'
      a.href = URL.createObjectURL(fileBlob)
      a.click()
    },
    openFile () {
      // create input element
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
          // exec
          this.views = fileObject.views
          this.pointsInput = fileObject.pointsInput
          this.updateDraw()
        } catch (e) {
          console.error(e)
          alert(this.$t('alert.errorFile'))
        }
      }
      input.click()
    },
    stash () {
      localStorage.setItem('array-field-stash', JSON.stringify({
        views: this.views,
        pointsInput: this.pointsInput,
        cursorFunction: this.cursorFunction,
        pointSelect: this.pointSelect
      }))
      console.debug('stashed')
    },
    clear () {
      // reset all
      this.pointsInput = []
      this.cursorFunction = 'point'
      this.pointSelect = -1
      this.updateDraw()
    },
    exportImage (type) {
      const svgSource = document.getElementById('svg')
        .innerHTML.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
      const a = document.createElement('a')
      const svgBlob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n', svgSource])
      if (type === 'svg') {
        a.href = URL.createObjectURL(svgBlob)
        a.download = 'array-field.svg'
        a.click()
      } else if (type === 'png') {
        // convert svg to png
        const canvas = document.createElement('canvas')
        canvas.width = this.borderLength
        canvas.height = this.borderLength
        const ctx = canvas.getContext('2d')
        const img = document.createElement('img')
        img.width = this.borderLength
        img.height = this.borderLength
        img.src = 'data:image/svg+xml;base64,' + btoa(svgSource)
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
          a.href = canvas.toDataURL('image/png')
          a.download = 'array-field.png'
          a.click()
        }
      } else {
        // unknown type
        console.error('unknown image type')
      }
    }
  },
  beforeUpdate () {
    // stash
    if (stashTimer > 0) {
      clearTimeout(stashTimer)
    }
    stashTimer = setTimeout(this.stash, 1000)
  },
  mounted () {
    // get width
    const length = document.getElementById('svg').offsetWidth
    // set height
    if (this.$route.query.points !== undefined) {
      // insert point
    }
    this.borderLength = length
    xDirScale = d3.scaleLinear().domain([-1, 1]).range([0, length])
    yDirScale = d3.scaleLinear().domain([-1, 1]).range([length, 0])
    dirScale = d3.scaleLinear().domain([0, 2]).range([0, length])
    xPointScale = d3.scaleLinear().domain([-2, 2]).range([0, length])
    yPointScale = d3.scaleLinear().domain([-2, 2]).range([length, 0])
    // create svg
    this.svg = d3.select('#svg')
      .append('svg')
      .attr('width', this.borderLength)
      .attr('height', this.borderLength)
      .attr('style', 'cursor: crosshair')
      .on('mouseleave', e => {
        this.mouseDown = false
        if (this.cursorFunction === 'phi') {
        } else if (this.cursorFunction === 'point') {
          this.xInput = 0
          this.yInput = 0
        }
        cursorEle.attr('style', 'display: none')
      })
      .on('mouseenter', e => {
        cursorEle.attr('style', '')
      })
      .on('mousemove', e => {
        const cursorPath = d3.path()
        if (this.cursorFunction === 'phi') {
          const x = xDirScale.invert(e.offsetX)
          const y = yDirScale.invert(e.offsetY)
          const direction = Math.atan2(y, x)
          cursorPath.moveTo(xDirScale(0), yDirScale(0))
          cursorPath.lineTo(xDirScale(Math.cos(direction)), yDirScale(Math.sin(direction)))
          if (this.mouseDown) {
            // real-time
            this.phiInput = direction
            this.inverseSolvePhase()
          }
        } else if (this.cursorFunction === 'point') {
          const x = xPointScale.invert(e.offsetX)
          const y = yPointScale.invert(e.offsetY)
          cursorPath.moveTo(0, e.offsetY)
          cursorPath.lineTo(this.borderLength, e.offsetY)
          cursorPath.closePath()
          cursorPath.moveTo(e.offsetX, 0)
          cursorPath.lineTo(e.offsetX, this.borderLength)
          cursorPath.closePath()
          if (this.pointSelect === -1) {
            this.xInput = x
            this.yInput = y
          } else if (this.mouseDown) {
            // change position
            this.pointsInput[this.pointSelect] = {
              x, y, phase: this.pointsInput[this.pointSelect].phase
            }
            this.updateDraw()
          }
        }
        cursorEle.attr('d', cursorPath)
      })
      .on('mousedown', e => {
        this.mouseDown = true
        if (this.cursorFunction === 'phi') {
          // set phi
          const x = xDirScale.invert(e.offsetX)
          const y = yDirScale.invert(e.offsetY)
          this.phiInput = Math.atan2(y, x)
          this.inverseSolvePhase()
        } else if (this.cursorFunction === 'point') {
          const x = xPointScale.invert(e.offsetX)
          const y = yPointScale.invert(e.offsetY)
          if (this.pointSelect === -1) {
            // add new point
            this.pushPoint(x, y, 0)
          } else {
            // move point
            this.pointsInput[this.pointSelect] = { x, y, phase: this.pointsInput[this.pointSelect].phase }
            this.updateDraw()
          }
        }
      })
      .on('mouseup', () => { this.mouseDown = false })
    // add cursor path
    cursorEle = this.svg.append('path')
      .attr('stroke', '#FF0000D0')
      .attr('stroke-dasharray', '10,15')
    // add polar axis
    const polarAxis = d3.path()
    for (let i = 0.2; i <= 1; i += 0.2) {
      polarAxis.arc(xDirScale(0), yDirScale(0), dirScale(i), 0, Math.PI * 2)
      polarAxis.closePath()
    }
    for (let rad = 0; rad < Math.PI * 2; rad += Math.PI / 8) {
      polarAxis.moveTo(xDirScale(Math.cos(rad)), yDirScale(Math.sin(rad)))
      polarAxis.lineTo(xDirScale(-Math.cos(rad)), yDirScale(-Math.sin(rad)))
      polarAxis.closePath()
    }
    this.polarAxis = this.svg.append('path')
      .attr('stroke', 'rgba(255,116,49,0.31)')
      .attr('fill', 'none')
      .attr('d', polarAxis)
    // add Cartesian axis
    const cartesianAxis = d3.path()
    for (let i = -2; i <= 2; i += 0.5) {
      cartesianAxis.moveTo(xPointScale(i), yPointScale(-2))
      cartesianAxis.lineTo(xPointScale(i), yPointScale(2))
      cartesianAxis.closePath()
      cartesianAxis.moveTo(xPointScale(-2), yPointScale(i))
      cartesianAxis.lineTo(xPointScale(2), yPointScale(i))
      cartesianAxis.closePath()
    }
    this.cartesianAxis = this.svg.append('path')
      .attr('stroke', '#005EFF66')
      .attr('fill', 'none')
      .attr('d', cartesianAxis)
    // add directivity
    this.directivityPath = this.svg.append('path')
      .attr('stroke', '#ff6518')
      .attr('stroke-width', '2px')
      .attr('fill', 'none')
    // add points
    this.pointsPath = this.svg.append('path')
      .attr('fill', '#146bff')
    const stash = localStorage.getItem('array-field-stash')
    if (stash !== null) {
      // load
      try {
        const fileObject = JSON.parse(stash)
        console.debug(fileObject)
        // exec
        this.views = fileObject.views
        this.pointsInput = fileObject.pointsInput
        this.cursorFunction = fileObject.cursorFunction
        this.pointSelect = fileObject.pointSelect
        this.updateDraw()
      } catch (e) {
        console.error(e)
        alert(this.$t('alert.errorFile'))
      }
    }
  }
}
</script>

<style scoped>
p {
  margin: 0;
  padding: 0;
}
label {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
}
#home {
  width: 100%;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.selected {
  background-color: rgba(0,64,130,0.45);
}

.graph {
  width: 100%;
}

.panel {
  width: 100%;
  height: 30vh;
  overflow-y: scroll;
}

@media screen and (min-width: 768px) {
  .graph {
    width: 50%;
  }
  .panel {
    width: 50%;
    height: 90vh;
  }
  .panel-body {
    padding-left: 30px;
  }
}
</style>
