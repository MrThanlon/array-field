<template>
  <div id="home">
    <div id="svg" class="graph" ref="graph">
    </div>
    <div class="panel" ref="panel">
      <div class="panel-body">
        <details open>
          <summary>Views</summary>
          <div style="display: flex;justify-content: space-between;flex-wrap: wrap">
            <label>
              Directivity
              <input type="checkbox"
                     v-model="views.directivity"
                     @change="directivityPath.attr('style',views.directivity?'':'display: none')">
            </label>
            <label>
              Directivity axis
              <input type="checkbox"
                     v-model="views.polarAxis"
                     @change="polarAxis.attr('style',views.polarAxis?'':'display: none')">
            </label>
            <label>
              Point
              <input type="checkbox"
                     v-model="views.points"
                     @change="pointsPath.attr('style',views.points?'':'display: none')">
            </label>
            <label>
              Point axis
              <input type="checkbox"
                     v-model="views.cartesianAxis"
                     @change="cartesianAxis.attr('style',views.cartesianAxis?'':'display: none')">
            </label>
          </div>
        </details>
        <details open>
          <summary>Point sources</summary>
          <ul style="overflow-y: scroll">
            <li v-for="(item, idx) in pointsInput" :key="item+idx">
              <p>x: <input type="number" step="0.1" v-model="item.x" @input="updateDraw"> &lambda;</p>
              <p>y: <input type="number" step="0.1" v-model="item.y" @input="updateDraw"> &lambda;</p>
              <p>phase: <input type="number" v-model="item.phase" @input="updateDraw"> rad</p>
              <p><button @click="deletePoint(idx)">delete</button></p>
            </li>
            <li>
              <p>x: <input type="number" step="0.1" v-model="xInput"> &lambda;</p>
              <p>y: <input type="number" step="0.1" v-model="yInput"> &lambda;</p>
              <p>phase: <input type="number" v-model="phaseInput"> rad</p>
              <p>
                <button @click="pushPoint(parseFloat(xInput),parseFloat(yInput),parseFloat(phaseInput))">
                  add
                </button>
              </p>
            </li>
          </ul>
        </details>
        <details open>
          <summary>Inverse Solve Phase</summary>
          <div>
            <label>
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
        this.pointsInput[idx].phase = phase
      })
      this.updateDraw()
    },
    updateDraw () {
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
    }
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
      .attr('fill', 'rgba(0,0,0,0)')
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
      .attr('fill', 'rgba(0,0,0,0)')
      .attr('d', cartesianAxis)
    // add directivity
    this.directivityPath = this.svg.append('path')
      .attr('stroke', '#ff6518')
      .attr('stroke-width', '2px')
      .attr('fill', 'rgba(0,0,0,0)')
    // add points
    this.pointsPath = this.svg.append('path')
      .attr('fill', '#146bff')
  }
}
</script>

<style scoped>
p {
  margin: 0;
  padding: 0;
}
label {
  margin: 0 10px;
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
