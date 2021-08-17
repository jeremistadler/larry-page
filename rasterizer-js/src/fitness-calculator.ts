import {
  ColorMapItemNormalized,
  ColorMapNormalized,
  RGB_Norm_Buffer,
  Settings,
  Triangle_Buffer,
  TRIANGLE_SIZE,
} from './types'

function cross(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
) {
  return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax)
}

function orient2d(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

// (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])

// (A.x−B.x)∗(P.y−A.y)−(A.y−B.y)∗(P.x−A.x).

export function calculateFitness(
  settings: Settings,
  triangles: Triangle_Buffer,
  imageTex: RGB_Norm_Buffer,
  colorMap: ColorMapNormalized,
) {
  const tex = new Float32Array(
    settings.size * settings.size * 3,
  ) as RGB_Norm_Buffer
  tex.fill(1)

  for (let i = 0; i < triangles.length; i += TRIANGLE_SIZE) {
    fillTriangle(triangles, tex, i, settings.size, colorMap[i / TRIANGLE_SIZE])
  }

  return diffAndCalculateFitness(imageTex, tex)
}

export function drawTrianglesToTexture(
  settings: Settings,
  triangles: Triangle_Buffer,
  colorMap: ColorMapNormalized,
) {
  const tex = new Float32Array(
    settings.size * settings.size * 3,
  ) as RGB_Norm_Buffer
  tex.fill(1)

  for (let i = 0; i < triangles.length; i += TRIANGLE_SIZE) {
    fillTriangle(triangles, tex, i, settings.size, colorMap[i / TRIANGLE_SIZE])
  }

  return tex
}

function fillTriangle(
  triangles: Triangle_Buffer,
  tex: RGB_Norm_Buffer,
  startIndex: number,
  resultCanvasSize: number,
  color: ColorMapItemNormalized,
) {
  const v0x = triangles[startIndex + 0] * resultCanvasSize
  const v0y = triangles[startIndex + 1] * resultCanvasSize
  const v1x = triangles[startIndex + 2] * resultCanvasSize
  const v1y = triangles[startIndex + 3] * resultCanvasSize
  const v2x = triangles[startIndex + 4] * resultCanvasSize
  const v2y = triangles[startIndex + 5] * resultCanvasSize

  const a0 = Math.min(1, Math.max(0, triangles[startIndex + 6]))
  const a1 = Math.min(1, Math.max(0, triangles[startIndex + 7]))
  const a2 = Math.min(1, Math.max(0, triangles[startIndex + 8]))

  const r = color[0]
  const g = color[1]
  const b = color[2]

  let minX = Math.floor(Math.min(v0x, v1x, v2x))
  let maxX = Math.ceil(Math.max(v0x, v1x, v2x))
  let minY = Math.floor(Math.min(v0y, v1y, v2y))
  let maxY = Math.ceil(Math.max(v0y, v1y, v2y))

  if (
    minX > resultCanvasSize - 1 ||
    maxX < 0 ||
    minY > resultCanvasSize - 1 ||
    maxY < 0
  )
    return

  if (minX < 0) minX = 0
  if (minY < 0) minY = 0
  if (maxX > resultCanvasSize - 1) maxX = resultCanvasSize - 1
  if (maxY > resultCanvasSize - 1) maxY = resultCanvasSize - 1

  // precalculate the area of the parallelogram defined by our triangle
  let area = cross(v0x, v0y, v1x, v1y, v2x, v2y)

  let ccw = area < 0

  if (ccw) {
    area = Math.abs(area)
  }

  // get all properties on our first vertex, for interpolating later
  // var props = Object.getOwnPropertyNames(v0)

  // // calculate edges
  const edge0 = {x: v2x - v1x, y: v2y - v1y} as const
  const edge1 = {x: v0x - v2x, y: v0y - v2y} as const
  const edge2 = {x: v1x - v0x, y: v1y - v0y} as const

  // calculate which edges are right edges so we can easily skip them
  // right edges go up, or (bottom edges) are horizontal edges that go right
  const edgeRight0 = edge0.y < 0 || (edge0.y == 0 && edge0.x > 0)
  const edgeRight1 = edge1.y < 0 || (edge1.y == 0 && edge0.x > 0)
  const edgeRight2 = edge2.y < 0 || (edge2.y == 0 && edge0.x > 0)

  // p is our 2D pixel location point
  let px = 0
  let py = 0
  let w0 = 0
  let w1 = 0
  let w2 = 0

  for (var y = minY; y < maxY; y++) {
    for (var x = minX; x < maxX; x++) {
      // sample from the center of the pixel, not the top-left corner
      px = x + 0.5
      py = y + 0.5

      if (ccw) {
        w0 = orient2d(v1x, v1y, v2x, v2y, px, py)
        w1 = orient2d(v2x, v2y, v0x, v0y, px, py)
        w2 = orient2d(v0x, v0y, v1x, v1y, px, py)
      } else {
        w0 = cross(v1x, v1y, v2x, v2y, px, py)
        w1 = cross(v2x, v2y, v0x, v0y, px, py)
        w2 = cross(v0x, v0y, v1x, v1y, px, py)
      }

      // if the point is not inside our polygon, skip fragment
      if (w0 < 0 || w1 < 0 || w2 < 0) {
        continue
      }

      // if this is a right or bottom edge, skip fragment (top-left rule):
      if (
        (w0 == 0 && edgeRight0) ||
        (w1 == 0 && edgeRight1) ||
        (w2 == 0 && edgeRight2)
      ) {
        continue
      }

      // interpolate our vertices to get alpha
      const alpha = (w0 * a0 + w1 * a1 + w2 * a2) / area
      const index = (y * resultCanvasSize + x) * 3

      // if (index < 0 || index > tex.length)
      //   throw new Error('Tex index out of range')

      // if (isNaN(alpha)) debugger
      // if (isNaN(r)) debugger

      tex[index + 0] = (1 - alpha) * tex[index + 0] + alpha * r
      tex[index + 1] = (1 - alpha) * tex[index + 1] + alpha * g
      tex[index + 2] = (1 - alpha) * tex[index + 2] + alpha * b
    }
  }
}

function diffAndCalculateFitness(
  img: RGB_Norm_Buffer,
  triangleTex: RGB_Norm_Buffer,
) {
  let diff = 0
  for (var i = 0; i < triangleTex.length; i++) {
    var q = Math.abs(triangleTex[i] - img[i])
    diff += q
  }

  return diff / img.length
}
