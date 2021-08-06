import reglI from 'regl'

export const regl = reglI({
  extensions: [
    'webgl_draw_buffers',
    'oes_texture_float',
    'WEBGL_color_buffer_float',
  ],
  attributes: {
    alpha: false,
    antialias: true,
  },
  // preserveDrawingBuffer: 'gl',
})
