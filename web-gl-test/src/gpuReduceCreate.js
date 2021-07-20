import {regl} from './regl'
import {TEXTURE_SIZE} from './triangles'

export function gpuReduceCreate() {
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
  var DIM = Math.sqrt(TEXTURE_SIZE)
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
