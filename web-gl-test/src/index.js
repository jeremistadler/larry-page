import reglI from 'regl'

const regl = reglI({
  extensions: [
    'webgl_draw_buffers',
    'oes_texture_float',
    'WEBGL_color_buffer_float',
  ],
})

const triangles = [
  {
    pos: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    color: [
      [0.5, 0.3, 0.4, 0.8],
      [0.2, 0.6, 0.4, 0.8],
      [0.4, 0.1, 0.1, 0.8],
    ],
  },

  {
    pos: [
      [1, 1],
      [-0.3, -0.7],
      [0.2, -0.6],
    ],
    color: [
      [0.2, 0.2, 0.6, 0.8],
      [0.2, 0.2, 0.9, 0.8],
      [0.2, 0.2, 0.8, 0.8],
    ],
  },
]

const posBuffer = regl.buffer({
  length: 2 * 3 * 4 * triangles.length,
  type: 'float',
  usage: 'dynamic',
})

const colorBuffer = regl.buffer({
  length: 4 * 3 * 4 * triangles.length,
  type: 'float',
  usage: 'dynamic',
})

var tempTexture = regl.framebuffer({
  width: 1024,
  height: 1024,
  format: 'rgba',
  type: 'float',
  mag: 'nearest',
  min: 'nearest',
})

var temp2Texture = regl.framebuffer({
  width: 1024,
  height: 1024,
  format: 'rgba',
  type: 'float',
  mag: 'nearest',
  min: 'nearest',
})

var temp3Texture = regl.framebuffer({
  width: 1024,
  height: 1024,
  format: 'rgba',
  type: 'float',
  mag: 'nearest',
  min: 'nearest',
})

const drawTriangles = regl({
  frag: `
  precision mediump float;
  varying vec4 vColor;
  
  void main() {
    gl_FragColor = vColor;
  }`,

  vert: `
  precision mediump float;
  attribute vec2 position;
  
  attribute vec4 color;
  varying vec4 vColor;

  void main() {
    gl_Position = vec4(position.x, position.y, 0, 1);
    vColor = color;
  }`,

  attributes: {
    position: posBuffer,
    color: colorBuffer,
  },

  uniforms: {
    // This defines the color of the triangle to be a dynamic variable
    // color: regl.prop('color'),
  },

  depth: {enable: false},

  blend: {
    enable: true,
    func: {
      srcRGB: 'src alpha',
      srcAlpha: 'src alpha',
      dstRGB: 'one minus src alpha',
      dstAlpha: 'one minus src alpha',
    },
  },

  framebuffer: regl.prop('outFbo'),

  // This tells regl the number of vertices to draw in this command
  count: 3,
})

const renderTexture = regl({
  frag: `
  precision mediump float;
  uniform sampler2D texture;
  varying vec2 uv;
  void main () {
    gl_FragColor = texture2D(texture, uv);
  }`,

  vert: `
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main () {
    uv = position;
    gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
  }`,

  attributes: {
    position: [-2, 0, 0, -2, 2, 2],
  },

  uniforms: {
    texture: regl.prop('texture'),
  },

  count: 3,
})

const diffTextures = regl({
  frag: `
  precision mediump float;
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  varying vec2 uv;
  void main () {
    gl_FragColor = texture2D(texture1, uv) - texture2D(texture2, uv);
  }`,

  vert: `
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main () {
    uv = position;
    gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
  }`,

  attributes: {
    position: [-2, 0, 0, -2, 2, 2],
  },

  uniforms: {
    texture1: regl.prop('texture1'),
    texture2: regl.prop('texture2'),
  },

  framebuffer: regl.prop('outFbo'),

  count: 3,
})

function gpuReduceCreate() {
  // a single reduce pass
  var reducePass = regl({
    frag: `
      precision mediump float;
      uniform sampler2D tex;
      varying vec2 uv;
      uniform float rcpDim;

      void main () {
        float a = texture2D(tex, uv - vec2(0.0, 0.0) * rcpDim).x;
        float b = texture2D(tex, uv - vec2(1.0, 0.0) * rcpDim).x;
        float c = texture2D(tex, uv - vec2(0.0, 1.0) * rcpDim).x;
        float d = texture2D(tex, uv - vec2(1.0, 1.0) * rcpDim).x;
        float result = a + b + c + d;
        gl_FragColor = vec4(result);
      }`,

    vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 uv;

      void main () {
        uv = position;
        gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
      }`,

    attributes: {
      position: [-2, 0, 0, -2, 2, 2],
    },

    uniforms: {
      tex: regl.prop('inTex'),
      rcpDim: regl.prop('rcpDim'), // reciprocal texture dimensions.
    },

    framebuffer: regl.prop('outFbo'),

    count: 3,
  })

  // dimensions of the first texture is (dim)X(dim).
  var DIM = Math.sqrt(tempTexture)
  var dim = DIM

  var fbos = []
  do {
    dim >>= 1
    fbos.push(
      regl.framebuffer({
        colorFormat: 'rgba',
        colorType: 'float',
        width: dim,
        height: dim,
      }),
    )
  } while (dim > 1)

  // We'll be calling this function when profiling.  Otherwise, the
  // comparison with the CPU will be unfair, because creating all
  // those FBOs takes quite a bit of time, so the GPU would always be
  // slower than the CPU.
  return function (inputTexture) {
    // first pass.
    reducePass({
      inTex: inputTexture,
      outFbo: fbos[0],
      rcpDim: 1.0 / (fbos[0].width * 2),
    })

    // the rest of the passes.
    for (let i = 0; i < fbos.length - 1; i++) {
      var inFbo = fbos[i + 0]
      var outFbo = fbos[i + 1]

      reducePass({
        inTex: inFbo.color[0],
        outFbo: outFbo,
        rcpDim: 1.0 / (outFbo.width * 2),
      })
    }

    // now retrieve the result from the GPU
    var result
    regl({framebuffer: fbos[fbos.length - 1]})(() => {
      result = regl.read()[0]
    })
    return result
  }
}

regl.clear({
  color: [0, 0, 0, 0],
  depth: 1,
})

posBuffer.subdata(triangles.map(f => f.pos))
colorBuffer.subdata(triangles.map(f => f.color))

drawTriangles({
  outFbo: tempTexture,
})

posBuffer.subdata(triangles[1].pos)
colorBuffer.subdata(triangles[1].color)

// draw a triangle using the command defined above
drawTriangles({
  outFbo: temp2Texture,
})

diffTextures({
  texture1: tempTexture,
  texture2: temp2Texture,
  outFbo: temp3Texture,
})

renderTexture({texture: temp3Texture})

var gpuReduce = gpuReduceCreate()
const result = gpuReduce(temp3Texture)

console.log(result)
