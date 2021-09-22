import {ColorMapNormalized, ColorMapItemNormalized} from './micro.js'

export function createColorMap(count: number, palette: ColorMapNormalized) {
  const colorMap: ColorMapNormalized = []

  for (let i = 0; i < count; i++) {
    colorMap.push(palette[Math.floor((i / count) * palette.length)])
  }
  return colorMap
}

export const RisoColors = {
  FluorescentPink: [255 / 255, 72 / 255, 176 / 255] as ColorMapItemNormalized,
  Blue: [0, 120 / 255, 191 / 255] as ColorMapItemNormalized,
  Green: [0, 169 / 255, 92 / 255] as ColorMapItemNormalized,
  Orange: [255 / 255, 108 / 255, 47 / 255] as ColorMapItemNormalized,
  Red: [255 / 255, 10 / 255, 10 / 255] as ColorMapItemNormalized,
  White: [255 / 255, 255 / 255, 255 / 255] as ColorMapItemNormalized,
  Yellow: [255 / 255, 232 / 255, 0 / 255] as ColorMapItemNormalized,
} as const

const ColorMap = new Map<ColorMapItemNormalized, string>(
  Object.keys(RisoColors).map(key => [RisoColors[key], key]),
)

export function colorToName(color: ColorMapItemNormalized) {
  return ColorMap.get(color)
}

export function colorPaletteToHash(palette: ColorMapNormalized) {
  if (palette.length > 10)
    throw new Error('Palette cannot have more than 10 colors')

  return palette.map(item => ColorMap.get(item)).join(',')
}
