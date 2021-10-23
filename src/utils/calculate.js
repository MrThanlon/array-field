function PointSource (dr, theta, phase) {
  this.dr = dr
  this.theta = theta
  this.phase = phase
}

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

function Field (points, circlePoints = 360) {
  this.points = points
  this.rs = Array(circlePoints).fill(0)
  // calculate, |sum(dots) of e^(i*dr*cos(phi-theta)+phase)|
  this.dphi = Math.PI * 2 / circlePoints
  this.param = {
    mainBeam: 0,
    leftBeam: Math.PI,
    rightBeam: -Math.PI,
    halfPowerBeamWidth: Math.PI * 2
  }
  if (points.length === 0) {
    return
  }
  this.rs = this.rs.map((r, idx) => {
    const phi = this.dphi * idx
    const sum = points.reduce((acc, point) => {
      const psi = point.dr * Math.cos(phi - point.theta) + point.phase
      return [acc[0] + Math.cos(psi), acc[1] + Math.sin(psi)]
    }, [0, 0])
    return Math.sqrt(sum[0] ** 2 + sum[1] ** 2)
  })
  // max result
  const maxRs = Math.max.apply(null, this.rs)
  // half-power beam-width
  const halfPower = Math.sqrt(2) * maxRs / 2
  for (let i = 0; i < circlePoints; i++) {
    // FIXME: use equals(?)
    if (this.rs[i] === maxRs) {
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
  // normalize
  this.rs = this.rs.map(v => v / maxRs)
}

Field.prototype.inverseSolvePhase = function (phi) {
  // let dr*cos(phi-theta)+phase=0
  // update phase
  this.points = this.points.map(({ dr, theta, phase }) => {
    return new PointSource(dr, theta, -dr * Math.cos(phi - theta))
  })
}

export {
  Field,
  PointSource
}
