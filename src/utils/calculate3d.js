import {
  IcosahedronGeometry,
  ShaderMaterial,
  Vector4,
  Mesh
} from 'three'

const fragmentShader = `
float colormap_red(float x) {
  if (x < 0.7) {
    return 4.0 * x - 1.5;
  } else {
    return -4.0 * x + 4.5;
  }
}

float colormap_green(float x) {
  if (x < 0.5) {
    return 4.0 * x - 0.5;
  } else {
    return -4.0 * x + 3.5;
  }
}

float colormap_blue(float x) {
  if (x < 0.3) {
    return 4.0 * x + 0.5;
  } else {
    return -4.0 * x + 2.5;
  }
}
vec4 colormap(float x) {
  float r = clamp(colormap_red(x), 0.0, 1.0);
  float g = clamp(colormap_green(x), 0.0, 1.0);
  float b = clamp(colormap_blue(x), 0.0, 1.0);
  return vec4(r, g, b, 1.0);
}
varying float d;
void main() {
  gl_FragColor = colormap(d);
}
`
const material = new ShaderMaterial({
  vertexShader: `
varying float d;
void main() {
  d = distance(position, vec3(0, 0, 0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader
})

/**
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {Number} phase
 * @constructor
 */
function PointSource (x, y, z, phase) {
  this.x = 2 * Math.PI * x
  this.y = 2 * Math.PI * y
  this.z = 2 * Math.PI * z
  this.ri = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2)
  this.phase = phase
}

/**
 * Calculate field
 * @param {Array<PointSource>} points
 * @param {Number} detail
 * @param {String} useGPU
 * @constructor
 */
function Field (points, detail = 20, useGPU = '') {
  this.points = points
  this.useGPU = useGPU
  this.detail = detail
  // base geometry
  this.geometry = new IcosahedronGeometry(1, this.detail)
  if (useGPU === 'vertex') {
    // init vertexComputeMaterial
    this.mesh = new Mesh(this.geometry, new ShaderMaterial({
      uniforms: {
        pointSources: {
          value: Array(1000).fill(new Vector4(0, 0, 0, 0))
        },
        pointNum: {
          value: 0
        }
      },
      vertexShader: `
      varying float d;
      uniform vec4 pointSources[1000];
      uniform int pointNum;
      void main() {
        vec2 r;
        float pointNumF = float(pointNum);
        for (int i=0;i<pointNum;i++) {
          float psi = dot(vec4(position, 1.0), pointSources[i]);
          r.x += cos(psi);
          r.y += sin(psi);
        }
        d = length(r) / pointNumF;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position * d, 1.0);
      }
      `,
      fragmentShader
    }))
    this.pointAlignLength = 1000
  } else if (useGPU === 'fragment') {
  } else if (useGPU === 'compute') {
  } else {
    this.mesh = new Mesh(this.geometry, material)
  }
  this.updatePoints(points)
}

Field.prototype.updatePoints = function (points) {
  if (this.useGPU === 'vertex') {
    console.debug('[GPU vertex] update points')
    if (points.length > this.pointAlignLength) {
      // recompile
      this.mesh.material = new ShaderMaterial({
        uniforms: {
          pointSources: {
            value: points.map(point => new Vector4(
              point.x, point.y, point.z, point.phase
            ))
          },
          pointNum: {
            value: points.length
          }
        },
        vertexShader: `
        varying float d;
        uniform vec4 pointSources[${points.length}];
        uniform int pointNum;
        void main() {
          vec2 r;
          float pointNumF = float(pointNum);
          for (int i=0;i<pointNum;i++) {
            float psi = dot(vec4(position, 1.0), pointSources[i]);
            r.x += cos(psi);
            r.y += sin(psi);
          }
          d = length(r) / pointNumF;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position * d, 1.0);
        }
        `,
        fragmentShader
      })
      this.pointAlignLength = points.length
    } else {
      // less than origin
      this.mesh.material.uniforms.pointNum.value = points.length
      this.mesh.material.uniforms.pointSources.value = points.map(
        point => new Vector4(point.x, point.y, point.z, point.phase))
        // align
        .concat(Array(this.pointAlignLength - points.length)
          .fill(new Vector4(0, 0, 0, 0)))
    }
    this.mesh.material.needsUpdate = true
  } else if (this.useGPU === 'fragment') {
  } else if (this.useGPU === 'compute') {
  } else {
    console.debug('[CPU] update points')
    if (!('originGeometry' in this)) {
      this.originGeometry = new IcosahedronGeometry(1, this.detail)
    }
    const geoAttr = this.originGeometry.getAttribute('position')
    const attr = this.geometry.getAttribute('position')
    const len = points.length || 1
    for (let i = 0; i < attr.count; i++) {
      const offset = i * attr.itemSize
      const x = geoAttr.array[offset]
      const y = geoAttr.array[offset + 1]
      const z = geoAttr.array[offset + 2]
      const riComplex = points.reduce((pre, point) => {
        // vec(x,y,z) is unit vec
        const psi = (x * point.x + y * point.y + z * point.z) + point.phase
        pre[0] += Math.cos(psi)
        pre[1] += Math.sin(psi)
        return pre
      }, new Float32Array(2))
      const ri = Math.sqrt(riComplex[0] ** 2 + riComplex[1] ** 2) / len
      // update new coordinate
      attr.array[offset] = ri * x
      attr.array[offset + 1] = ri * y
      attr.array[offset + 2] = ri * z
    }
    this.geometry.attributes.position.needsUpdate = true
  }
  this.points = points
}

/**
 * TODO: Solve points phase
 * @param {Number} theta
 * @param {Number} phi
 */
Field.prototype.inverseSolvePhase = function (theta, phi) {
  const x = Math.sin(theta) * Math.cos(phi)
  const y = Math.sin(theta) * Math.sin(phi)
  const z = Math.cos(theta)
  // let psi=0
  this.points = this.points.map(point => {
    point.phase = -(x * point.x + y * point.y + z * point.z)
    return point
  })
}

export {
  Field,
  PointSource
}
