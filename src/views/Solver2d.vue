<template>
  <div id="home">
    <div id="row">
    <div id="svg" class="graph" ref="graph">
      <svg ref="svg" :width="borderLength" :height="borderLength">
        <path d="" ref="cursor"></path>
        <path d="" ref="polarAxis" v-show="views.polarAxis"></path>
        <path d="" ref="cartesianAxis" v-show="views.cartesianAxis"></path>
        <path d="" ref="directivity" v-show="views.radiationPattern"></path>
        <path d="" ref="points" v-show="views.points"></path>
        <path d="" ref="mainBeam" v-show="views.mainBeam"></path>
        <path d="" ref="halfPowerBeam" v-show="views.halfPowerBeam"></path>
      </svg>
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
            <button @click="exportResult">{{ $t('exportResult') }}</button>
          </div>
        </details>
        <details open>
          <summary>{{ $t('menu.views') }}</summary>
          <div style="display: flex;justify-content: space-between;flex-wrap: wrap">
            <label>
              {{ $t('radiationPattern') }}
              <input type="checkbox"
                     v-model="views.radiationPattern">
            </label>
            <label>
              {{ $t('mainBeamDirection') }}
              <input type="checkbox"
                     v-model="views.mainBeam">
            </label>
            <label>
              {{ $t('halfPowerBeamWidth') }}
              <input type="checkbox"
                     v-model="views.halfPowerBeam">
            </label>
            <label>
              {{ $t('radiationPatternAxis') }}
              <input type="checkbox"
                     v-model="views.polarAxis">
            </label>
            <label>
              {{ $t('point') }}
              <input type="checkbox"
                     v-model="views.points">
            </label>
            <label>
              {{ $t('pointAxis') }}
              <input type="checkbox"
                     v-model="views.cartesianAxis">
            </label>
          </div>
        </details>
        <details open>
          <summary>{{ $t('menu.param') }}</summary>
          <div>
            <table>
              <thead>
              <tr>
                <th>{{ $t('directivity') }}</th>
                <th @click="cursorFunction='directivity'"
                    style="cursor: pointer"
                    :class="{selected:cursorFunction==='directivity'}">
                  {{ $t('customDirectionGain') }}
                  <span v-if="cursorRAD!==null">({{ (cursorRAD*Math.PI*2/field.rs.length).toFixed(3) }}rad)</span>
                </th>
                <th>{{ $t('halfPowerBeamWidth') }}</th>
                <th>{{ $t('mainBeamDirection') }}</th>
              </tr>
              </thead>
              <tbody>
              <tr>
                <td>
                  &approx;{{
                    (field.rs[field.param.mainBeamPoint] / field.param.average).toFixed(3)
                  }}&approx;{{
                    (10 * Math.log10(field.rs[field.param.mainBeamPoint] / field.param.average)).toFixed(3)
                  }}dBi
                </td>
                <td @click="cursorFunction='directivity'"
                    style="cursor: pointer"
                    :class="{selected:cursorFunction==='directivity'}">
                  <span v-if="cursorFunction==='directivity'&&cursorRAD!==null">
                    &approx;{{ (field.rs[cursorRAD] / field.param.average).toFixed(3) }}
                    &approx;{{ (10 * Math.log10(field.rs[cursorRAD] / field.param.average)).toFixed(3) }}dBi
                  </span>
                  <span v-else>NaN</span>
                </td>
                <td>&approx;{{ (field.param.leftBeam - field.param.rightBeam).toFixed(3) }}rad</td>
                <td>&approx;{{ field.param.mainBeam.toFixed(3) }}rad</td>
              </tr>
              </tbody>
            </table>
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
              <p>
                <button @click="deletePoint(idx)">{{ $t('delete') }}</button>
              </p>
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
let stashTimer = -1
// SVG element
let cursorEle, radiationPatternPath, mainBeamPath, halfPowerBeamPath, pointsPath

export default {
  name: 'Solver2d',
  data () {
    return {
      field: new Field([]),
      views: {
        points: true,
        radiationPattern: true,
        cartesianAxis: true,
        mainBeam: true,
        halfPowerBeam: true,
        polarAxis: true
      },
      cursorFunction: 'point',
      cursorRAD: null,
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
      path.moveTo(xDirScale(this.field.rs[0]), yDirScale(0))
      for (let i = 1; i < this.field.rs.length; i++) {
        path.lineTo(xDirScale(this.field.rs[i] * Math.cos(i * this.field.dphi)),
          yDirScale(this.field.rs[i] * Math.sin(i * this.field.dphi)))
      }
      path.closePath()
      radiationPatternPath.attr('d', path)
      // beam param
      const mainBeam = d3.path()
      mainBeam.moveTo(xDirScale(0), yDirScale(0))
      mainBeam.lineTo(xDirScale(Math.cos(this.field.param.mainBeam)), yDirScale(Math.sin(this.field.param.mainBeam)))
      mainBeam.closePath()
      mainBeamPath.attr('d', mainBeam)
      // half-power beam
      const halfPowerBeam = d3.path()
      halfPowerBeam.moveTo(xDirScale(0), yDirScale(0))
      halfPowerBeam.lineTo(xDirScale(Math.cos(this.field.param.leftBeam)), yDirScale(Math.sin(this.field.param.leftBeam)))
      halfPowerBeam.closePath()
      halfPowerBeam.moveTo(xDirScale(0), yDirScale(0))
      halfPowerBeam.lineTo(xDirScale(Math.cos(this.field.param.rightBeam)), yDirScale(Math.sin(this.field.param.rightBeam)))
      halfPowerBeamPath.attr('d', halfPowerBeam)
      // draw points
      const points = d3.path()
      this.field.points.forEach(point => {
        points.arc(
          xPointScale(point.dr / Math.PI / 2 * Math.cos(point.theta)),
          yPointScale(point.dr / Math.PI / 2 * Math.sin(point.theta)),
          5, 0, Math.PI * 2)
        points.closePath()
      })
      pointsPath.attr('d', points)
    },
    inverseSolvePhase () {
      const phi = parseFloat(this.phiInput)
      this.field.inverseSolvePhase(phi)
      this.field.points.forEach(({ phase }, idx) => {
        this.pointsInput[idx].phase = phase % (2 * Math.PI)
      })
      this.updateDraw()
    },
    updateDraw () {
      // do draw
      this.field = new Field(this.pointsInput.map(({
        x,
        y,
        phase
      }) => {
        return PointSource.fromCartesian(x, y, phase)
      }))
      this.draw()
    },
    pushPoint (x, y, phase) {
      this.pointsInput.push({
        x,
        y,
        phase
      })
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
    },
    exportResult () {
      // generate string
      const result = 'dir\tval\n' + this.field.rs.map((v, idx) => {
        return `${idx * Math.PI * 2 / this.field.rs.length}\t${v}`
      }).join('\n')
      const resultBlob = new Blob([result])
      const a = document.createElement('a')
      a.href = URL.createObjectURL(resultBlob)
      a.download = 'result.txt'
      a.click()
    }
  },
  beforeUpdate () {
    // stash in 1Hz
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
    d3.select(this.$refs.svg)
      .attr('style', 'cursor: crosshair')
      .on('mouseleave', e => {
        this.mouseDown = false
        this.cursorRAD = null
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
        if (this.cursorFunction === 'phi' || this.cursorFunction === 'directivity') {
          const x = xDirScale.invert(e.offsetX)
          const y = yDirScale.invert(e.offsetY)
          const direction = Math.atan2(y, x)
          cursorPath.moveTo(xDirScale(0), yDirScale(0))
          cursorPath.lineTo(xDirScale(Math.cos(direction)), yDirScale(Math.sin(direction)))
          if (this.cursorFunction === 'phi') {
            if (this.mouseDown) {
              // real-time
              this.phiInput = direction
              this.inverseSolvePhase()
            }
          } else if (this.cursorFunction === 'directivity') {
            // show param
            if (direction >= 0) {
              this.cursorRAD = Math.round(direction * this.field.rs.length / (Math.PI * 2))
            } else {
              this.cursorRAD = Math.round((direction + Math.PI * 2) * this.field.rs.length / (Math.PI * 2))
            }
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
              x,
              y,
              phase: this.pointsInput[this.pointSelect].phase
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
            this.pointsInput[this.pointSelect] = {
              x,
              y,
              phase: this.pointsInput[this.pointSelect].phase
            }
            this.updateDraw()
          }
        }
      })
      .on('mouseup', () => {
        this.mouseDown = false
      })
    // add cursor path
    cursorEle = d3.select(this.$refs.cursor)
      .attr('stroke', '#000000')
      .attr('stroke-dasharray', '10,15')
    // add polar axis
    const polarAxisPath = d3.path()
    for (let i = 0.2; i <= 1; i += 0.2) {
      polarAxisPath.arc(xDirScale(0), yDirScale(0), dirScale(i), 0, Math.PI * 2)
      polarAxisPath.closePath()
    }
    for (let rad = 0; rad < Math.PI * 2; rad += Math.PI / 8) {
      polarAxisPath.moveTo(xDirScale(Math.cos(rad)), yDirScale(Math.sin(rad)))
      polarAxisPath.lineTo(xDirScale(-Math.cos(rad)), yDirScale(-Math.sin(rad)))
      polarAxisPath.closePath()
    }
    d3.select(this.$refs.polarAxis)
      .attr('stroke', 'rgba(255,116,49,0.31)')
      .attr('fill', 'none')
      .attr('d', polarAxisPath)
    // add Cartesian axis
    const cartesianAxisPath = d3.path()
    for (let i = -2; i <= 2; i += 0.5) {
      cartesianAxisPath.moveTo(xPointScale(i), yPointScale(-2))
      cartesianAxisPath.lineTo(xPointScale(i), yPointScale(2))
      cartesianAxisPath.closePath()
      cartesianAxisPath.moveTo(xPointScale(-2), yPointScale(i))
      cartesianAxisPath.lineTo(xPointScale(2), yPointScale(i))
      cartesianAxisPath.closePath()
    }
    d3.select(this.$refs.cartesianAxis)
      .attr('stroke', '#005EFF66')
      .attr('fill', 'none')
      .attr('d', cartesianAxisPath)
    // add directivity
    radiationPatternPath = d3.select(this.$refs.directivity)
      .attr('stroke', '#ff6518')
      .attr('stroke-width', '2px')
      .attr('fill', 'none')
    // main beam path
    mainBeamPath = d3.select(this.$refs.mainBeam)
      .attr('stroke', '#ff6518')
      .attr('stroke-width', '2px')
      .attr('stroke-dasharray', '10,15')
    // half-power beam path
    halfPowerBeamPath = d3.select(this.$refs.halfPowerBeam)
      .attr('stroke', '#ff6518')
      .attr('stroke-width', '1px')
      .attr('stroke-dasharray', '10,15')
    // add points
    pointsPath = d3.select(this.$refs.points)
      .attr('fill', '#146bff')
    const stash = localStorage.getItem('array-field-stash')
    if (stash !== null) {
      // load
      try {
        const fileObject = JSON.parse(stash)
        // exec
        this.views = fileObject.views
        this.pointsInput = fileObject.pointsInput
        this.cursorFunction = fileObject.cursorFunction
        this.pointSelect = fileObject.pointSelect
        this.updateDraw()
      } catch (e) {
        console.error(e)
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

table, td, th {
  border: 1px solid #000000;
  border-collapse: collapse;
  text-align: center;
}

#home {
  width: 100%;
  display: flex;
  justify-content: center;
}

#row {
  width: 100%;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

@media screen and (min-width: 1600px) {
  #row {
    width: 80%;
  }
}

@media screen and (min-width: 2500px){
  #row {
    width: 60%;
  }
}

.selected {
  background-color: rgba(0, 64, 130, 0.45);
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
