import sharp from 'sharp'
import {ImageData} from 'shared/src/ImageData'

export async function loadImage(
  path: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const {data, info} = await sharp(path)
    .resize(width, height, {fit: 'fill'})
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject: true})

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  }
}
