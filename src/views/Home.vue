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
              Directive
              <input type="checkbox"
                     v-model="views.directive"
                     @change="directive.attr('style',views.directive?'':'display: none')">
            </label>
            <label>
              Directive axis
              <input type="checkbox"
                     v-model="views.polarAxis"
                     @change="polarAxis.attr('style',views.polarAxis?'':'display: none')">
            </label>
            <label>
              Dot
              <input type="checkbox"
                     v-model="views.dots"
                     @change="dots.attr('style',views.dots?'':'display: none')">
            </label>
            <label>
              Dot axis
              <input type="checkbox"
                     v-model="views.cartesianAxis"
                     @change="cartesianAxis.attr('style',views.cartesianAxis?'':'display: none')">
            </label>
          </div>
        </details>
        <details open>
          <summary>Dot sources</summary>
          <ul style="overflow-y: scroll">
            <li v-for="(item, idx) in dotsInput" :key="item+idx">
              <p>x: <input type="number" v-model="item.x" @input="updateDraw"> &lambda;</p>
              <p>y: <input type="number" v-model="item.y" @input="updateDraw"> &lambda;</p>
              <p>phase: <input type="number" v-model="item.phase" @input="updateDraw"> rad</p>
              <p><button @click="deleteDot(idx)">delete</button></p>
            </li>
            <li>
              <p>x: <input type="number" v-model="xInput"> &lambda;</p>
              <p>y: <input type="number" v-model="yInput"> &lambda;</p>
              <p>phase: <input type="number" v-model="phaseInput"> rad</p>
              <p><button @click="pushDot(xInput,yInput,phaseInput)">add</button></p>
            </li>
          </ul>
        </details>
      </div>
    </div>
  </div>
</template>

<script>
import { Field, Dot } from '../utils/calculate'
import * as d3 from 'd3'

let xDirScale
let yDirScale
let dirScale
let xDotScale
let yDotScale

export default {
  name: 'Home',
  data () {
    return {
      svg: null,
      directive: null,
      dots: null,
      cartesianAxis: null,
      polarAxis: null,
      views: {
        dots: true,
        directive: true,
        cartesianAxis: true,
        polarAxis: true
      },
      borderLength: 0,
      dotsInput: [],
      xInput: 0,
      yInput: 0,
      phaseInput: 0
    }
  },
  methods: {
    draw (field) {
      // console.debug(field)
      const path = d3.path()
      // draw directive
      path.moveTo(xDirScale(field.rs[0]), yDirScale(0))
      for (let i = 1; i < field.rs.length; i++) {
        path.lineTo(xDirScale(field.rs[i] * Math.cos(i * field.dphi)),
          yDirScale(field.rs[i] * Math.sin(i * field.dphi)))
      }
      path.closePath()
      this.directive.attr('d', path)
      // draw dots
      const dots = d3.path()
      field.dots.forEach(dot => {
        dots.arc(
          xDotScale(dot.dr / Math.PI / 2 * Math.cos(dot.theta)),
          yDotScale(dot.dr / Math.PI / 2 * Math.sin(dot.theta)),
          7, 0, Math.PI * 2)
        dots.closePath()
      })
      this.dots.attr('d', dots)
    },
    updateDraw () {
      this.draw(new Field(this.dotsInput.map(({ x, y, phase }) => {
        return Dot.fromCartesian(parseFloat(x), parseFloat(y), parseFloat(phase))
      })))
    },
    pushDot (x, y, phase) {
      this.dotsInput.push({ x, y, phase })
      this.updateDraw()
    },
    deleteDot (idx) {
      this.dotsInput.splice(idx, 1)
      this.updateDraw()
    }
  },
  mounted () {
    // get width
    const length = document.getElementById('svg').offsetWidth
    // set height
    if (this.$route.query.dots !== undefined) {
      // insert dot
    }
    this.borderLength = length
    xDirScale = d3.scaleLinear().domain([-1, 1]).range([0, length])
    yDirScale = d3.scaleLinear().domain([-1, 1]).range([length, 0])
    dirScale = d3.scaleLinear().domain([0, 2]).range([0, length])
    xDotScale = d3.scaleLinear().domain([-2, 2]).range([0, length])
    yDotScale = d3.scaleLinear().domain([-2, 2]).range([length, 0])
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
      cartesianAxis.moveTo(xDotScale(i), yDotScale(-2))
      cartesianAxis.lineTo(xDotScale(i), yDotScale(2))
      cartesianAxis.closePath()
      cartesianAxis.moveTo(xDotScale(-2), yDotScale(i))
      cartesianAxis.lineTo(xDotScale(2), yDotScale(i))
      cartesianAxis.closePath()
    }
    this.cartesianAxis = this.svg.append('path')
      .attr('stroke', '#005EFF66')
      .attr('fill', 'rgba(0,0,0,0)')
      .attr('d', cartesianAxis)
    // add directive
    this.directive = this.svg.append('path')
      .attr('stroke', '#ff7431')
      .attr('stroke-width', '2px')
      .attr('fill', 'rgba(0,0,0,0)')
    // add dots
    this.dots = this.svg.append('path')
      .attr('fill', '#005eff')
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
