import {RGB_Norm_Buffer} from './micro.js'

export function imageToImageTex(
  imageData: ImageData,
  size: number,
  channels: number,
): RGB_Norm_Buffer {
  const tex = new Float32Array(size * size * 3) as RGB_Norm_Buffer

  const data = imageData.data
  const height = imageData.height
  const width = imageData.width

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      const pos = y * width + x

      tex[pos * 3 + 0] = data[pos * channels + 0] / 255
      tex[pos * 3 + 1] = data[pos * channels + 1] / 255
      tex[pos * 3 + 2] = data[pos * channels + 2] / 255
    }
  }

  return tex
}
