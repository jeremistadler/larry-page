import {regl} from './regl'

export const diffTextures = regl({
  frag: `
  precision highp float;
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  varying vec2 uv;

  void main () {
    vec4 v = texture2D(texture1, uv) - texture2D(texture2, uv);
    float luminance = 0.299 * v.r + 0.587 * v.g + 0.114 * v.b;
    // float inverted = luminance * luminance;
    float inverted = abs(luminance);
    gl_FragColor = vec4(inverted, inverted, inverted, 1);
  }`,

  vert: `
  precision highp float;
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
  depth: {enable: false},

  count: 3,
})
