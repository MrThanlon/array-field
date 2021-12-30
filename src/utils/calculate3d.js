/**
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {Number} phase
 * @constructor
 */
function PointSource (x, y, z, phase) {
  this.x = x
  this.y = y
  this.z = z
  this.phase = phase
}

/**
 * Calculate field
 * @param {Array<PointSource>} points
 * @param {Number} samples
 * @param {Boolean} useGPU
 * @constructor
 */
function Field (points, samples, useGPU = false) {
  this.points = points
  // construct sample point positions
}

/**
 * Solve points phase
 * @param {Number} theta
 * @param {Number} phi
 */
Field.prototype.inverseSolvePhase = function (theta, phi) {}

export {
  Field,
  PointSource
}
