declare module '*.png'
declare module '*.jpg'

declare module 'image-decode' {
  export default function imageDecode(params: Buffer): {
    width: number
    height: number
    data: Uint8ClampedArray
  }
}

declare module 'image-encode' {
  export default function imageEncode(
    pixels: Uint8ClampedArray,
    type: 'jpg' | 'png',
    shape: {width: number; height: number},
  ): ArrayBuffer
}
