import {regl} from './regl'
import {posBuffer, colorBuffer, triangles} from './triangles'

export const drawTriangles = regl({
  frag: `
  precision highp float;
  varying vec4 vColor;
  
  void main() {
    gl_FragColor = vColor;
  }`,

  vert: `
  precision highp float;
  attribute vec2 position;
  
  attribute vec4 color;
  varying vec4 vColor;

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

  void main() {
    gl_Position = vec4(normalizeCoords(position), 0, 1);
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
