import {regl} from './regl'
import {posBuffer, colorBuffer, triangles} from './triangles'

export const drawTriangles = regl({
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
  count: triangles.length * 3,
})
