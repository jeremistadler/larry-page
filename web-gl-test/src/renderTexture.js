import {regl} from './regl'

export const renderTexture = regl({
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

  vec2 normalizeCoords(vec2 position) {
    // Center in clip space
    // Convert from 0->1 to -0.5->+0.5
    vec2 centered = position - 0.5;
  
    // Increase texture in size so that it covers the entire screen
    // Convert from -0.5->+0.5 to -1->1
    vec2 full = centered * 2.0;
  
    // Flip y
    return full;// * vec2(1, -1);
  }
  
  void main () {
    uv = position;
    gl_Position = vec4(normalizeCoords(position), 0, 1);
  }`,

  attributes: {
    position: [-2, 0, 0, -2, 2, 2],
  },

  uniforms: {
    texture: regl.prop('texture'),
  },
  depth: {enable: false},
  framebuffer: null,

  blend: {
    enable: true,
    func: {
      srcRGB: 'src alpha',
      srcAlpha: 'src alpha',
      dstRGB: 'one minus src alpha',
      dstAlpha: 'one minus src alpha',
    },
  },

  count: 3,
})
