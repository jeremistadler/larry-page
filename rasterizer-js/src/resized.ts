import sharp from 'sharp'
import {imageToImageTex} from './imageToImageTex.js'

export async function loadAndResizeTex(imageName: string, size: number) {
  const resized = await sharp('./images_resized/' + size + '_' + imageName)
    .raw()
    .toBuffer({resolveWithObject: true})

  if (resized.info.width !== size || resized.info.height !== size) {
    throw new Error('Invalid image size, expected correct size')
  }

  const resizedImage = {
    width: resized.info.width,
    height: resized.info.height,
    data: Uint8ClampedArray.from(resized.data),
  }

  return imageToImageTex(resizedImage, size, resized.info.channels)
}
