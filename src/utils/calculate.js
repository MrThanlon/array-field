/**
 * @param {Number} dr
 * @param {Number} theta
 * @param {Number} phase
 * @constructor
 */
function PointSource (dr, theta, phase) {
  this.dr = dr
  this.theta = theta
  this.phase = phase
}

/**
 * Create new point source from Cartesian axis
 * @param {Number} x
 * @param {Number} y
 * @param {Number} phase
 * @return {PointSource}
 */
PointSource.fromCartesian = function (x, y, phase) {
  if (x === 0) {
    return new PointSource(
      2 * Math.PI * Math.abs(y),
      y >= 0 ? Math.PI / 2 : -Math.PI / 2,
      phase
    )
  } else {
    return new PointSource(
      2 * Math.PI * Math.sqrt(x ** 2 + y ** 2),
      Math.atan2(y, x),
      phase
    )
  }
}

/**
 * Calculate field
 * @param {Array<PointSource>} points
 * @param {Number} circlePoints
 * @constructor
 */
function Field (points, circlePoints = 360) {
  this.points = points
  this.rs = Array(circlePoints).fill(0)
  // calculate, |sum(dots) of e^(i*dr*cos(phi-theta)+phase)|
  this.dphi = Math.PI * 2 / circlePoints
  this.param = {
    // direction
    mainBeam: 0,
    leftBeam: Math.PI,
    rightBeam: -Math.PI,
    halfPowerBeamWidth: Math.PI * 2,
    // point position
    mainBeamPoint: 0,
    // value
    average: 1
  }
  if (points.length === 0) {
    return
  }
  this.rs = this.rs.map((r, idx) => {
    const phi = this.dphi * idx
    const sum = points.reduce((acc, point) => {
      const psi = point.dr * Math.cos(phi - point.theta) + point.phase
      acc[0] += Math.cos(psi)
      acc[1] += Math.sin(psi)
      return acc
    }, new Float32Array(2))
    return Math.sqrt(sum[0] ** 2 + sum[1] ** 2)
  })
  // max result
  const maxRs = Math.max.apply(null, this.rs)
  // half-power beam-width
  const halfPower = Math.sqrt(2) * maxRs / 2
  for (let i = 0; i < circlePoints; i++) {
    // FIXME: use equals(?)
    if (this.rs[i] === maxRs) {
      this.param.mainBeamPoint = i
      // main beam
      this.param.mainBeam = i * Math.PI * 2 / circlePoints
      // find right
      for (let j = i - 1; j >= i - circlePoints; j--) {
        if (this.rs[j >= 0 ? j : circlePoints + j] <= halfPower) {
          // found
          this.param.rightBeam = j * Math.PI * 2 / circlePoints
          break
        }
      }
      // left
      for (let j = i + 1; j <= i + circlePoints; j++) {
        if (this.rs[j < circlePoints ? j : j - circlePoints] <= halfPower) {
          // found
          this.param.leftBeam = j * Math.PI * 2 / circlePoints
          break
        }
      }
    }
  }
  // get average
  const sum = this.rs.reduce((acc, val) => {
    return acc + val
  }, 0)
  this.param.average = sum / circlePoints / maxRs
  // normalize
  this.rs.forEach((v, i) => {
    this.rs[i] = v / maxRs
  })
}

/**
 * Solve points phase
 * @param {Number} phi
 */
Field.prototype.inverseSolvePhase = function (phi) {
  // let dr*cos(phi-theta)+phase=0
  // update phase
  this.points.forEach(({ dr, theta }, idx) => {
    this.points[idx].phase = -dr * Math.cos(phi - theta)
  })
}

export {
  Field,
  PointSource
}
