function Dot (dr, theta, phase) {
  this.dr = dr
  this.theta = theta
  this.phase = phase
}

Dot.fromCartesian = (x, y, phase) => {
  if (x === 0) {
    return new Dot(
      2 * Math.PI * Math.abs(y),
      y >= 0 ? Math.PI / 2 : -Math.PI / 2,
      phase
    )
  } else {
    return new Dot(
      2 * Math.PI * Math.sqrt(x ** 2 + y ** 2),
      Math.atan2(y, x),
      phase
    )
  }
}

function Field (dots, points = 360) {
  this.dots = dots
  this.rs = Array(points).fill(0)
  if (dots.length === 0) {
    return
  }
  // calculate, |sum(dots) of e^(i*dr*cos(phi-theta)+phase)|
  this.dphi = Math.PI * 2 / points
  this.rs = this.rs.map((r, idx) => {
    const phi = this.dphi * idx
    const sum = dots.reduce((acc, dot) => {
      const psi = dot.dr * Math.cos(phi - dot.theta) + dot.phase
      return [acc[0] + Math.cos(psi), acc[1] + Math.sin(psi)]
    }, [0, 0])
    return Math.sqrt(sum[0] ** 2 + sum[1] ** 2)
  })
  // normalize
  const maxRs = Math.max.apply(null, this.rs)
  this.rs = this.rs.map(v => v / maxRs)
}

export {
  Field,
  Dot
}
