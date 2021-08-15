export type Settings = {
  size: number
  viewportSize: number
  triangleCount: number
  historySize: number
}

export type ColorMapItemNormalized = [R: number, G: number, B: number]
export type ColorMapNormalized = ColorMapItemNormalized[]

export const TRIANGLE_SIZE = 2 * 3 + 1 * 3 // (pos) + (alpha) = 9

/**
 * x0,y0 0,1
 * x1,y2 2,3
 * x2,y2 4,5
 * a0,a1,a2 6,7,8
 *
 * All values are from 0.0 to 1.0
 */
export type Triangle_Buffer = Float32Array & {
  readonly Triangle_Buffer: unique symbol
}

/**
 * RGB 0.0 to 1.0
 */
export type RGB_Norm_Buffer = Float32Array & {
  readonly RGB_Norm_Buffer: unique symbol
}

/**
 * R 0.0 to 1.0
 */
export type R_Norm_Buffer = Float32Array & {
  readonly R_Norm_Buffer: unique symbol
}

/**
 * RGB 0 to 255
 */
export type RGB_Byte_Buffer = Uint8Array & {
  readonly RGB_Norm_Buffer: unique symbol
}

/**
 * R 0 to 255
 */
export type R_Bit_Buffer = Uint8Array & {
  readonly R_Bit_Buffer: unique symbol
}
