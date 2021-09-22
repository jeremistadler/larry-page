import {
  CIRCLE_SIZE,
  ColorMapItemNormalized,
  ColorMapNormalized,
  RGB_Norm_Buffer,
  Settings,
  Pos_Buffer,
  TRIANGLE_SIZE,
  RGBA_Norm_Buffer,
  ColorLayer,
} from './micro.js'

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

function distance(p1x: number, p1y: number, p2x: number, p2y: number) {
  var dx = p2x - p1x
  var dy = p2y - p1y
  return Math.sqrt(dx * dx + dy * dy)
}

// (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])

// (A.x−B.x)∗(P.y−A.y)−(A.y−B.y)∗(P.x−A.x).

const cache = new Map<number, RGB_Norm_Buffer>()

export function drawTrianglesRGBA(
  settings: Settings,
  triangles: Pos_Buffer,
  buffer: RGBA_Norm_Buffer,
  color: ColorMapItemNormalized,
) {
  buffer.fill(0)

  for (let i = 0; i < triangles.length; i += TRIANGLE_SIZE) {
    fillTriangleRGBA(triangles, buffer, i, settings.size, settings.size, color)
  }
}

export function calculateFitnessForLayers(
  size: number,
  layers: ColorLayer[],
  img: RGB_Norm_Buffer,
) {
  let total = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const startIndex = (y * size + x) * 4
      let r = 1
      let g = 1
      let b = 1

      for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        const layer = layers[layerIndex]
        const alpha = layer.texBuffer[startIndex + 3]
        r = r * (1 - (1 - layer.texBuffer[startIndex + 0]) * alpha)
        g = g * (1 - (1 - layer.texBuffer[startIndex + 1]) * alpha)
        b = b * (1 - (1 - layer.texBuffer[startIndex + 2]) * alpha)
      }

      const imgStartIndex = (y * size + x) * 3
      total += Math.abs(img[imgStartIndex] - (1 - r))
      total += Math.abs(img[imgStartIndex + 1] - (1 - g))
      total += Math.abs(img[imgStartIndex + 2] - (1 - b))
    }
  }

  return total
}

export function drawAllLayers(size: number, layers: ColorLayer[]) {
  const tex = new Float32Array(size * size * 3) as RGB_Norm_Buffer

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const startIndex = (y * size + x) * 4
      let r = 1
      let g = 1
      let b = 1

      for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        const layer = layers[layerIndex]
        const alpha = layer.texBuffer[startIndex + 3]
        r = r * (1 - (1 - layer.texBuffer[startIndex + 0]) * alpha)
        g = g * (1 - (1 - layer.texBuffer[startIndex + 1]) * alpha)
        b = b * (1 - (1 - layer.texBuffer[startIndex + 2]) * alpha)
      }

      const imgStartIndex = (y * size + x) * 3
      tex[imgStartIndex + 0] = r
      tex[imgStartIndex + 1] = g
      tex[imgStartIndex + 2] = b
    }
  }

  return tex
}

export function calculateTriangleFitness(
  settings: Settings,
  triangles: Pos_Buffer,
  imageTex: RGB_Norm_Buffer,
  colorMap: ColorMapNormalized,
) {
  let tex = cache.get(settings.size)

  if (tex === undefined) {
    tex = new Float32Array(settings.size * settings.size * 3) as RGB_Norm_Buffer
    cache.set(settings.size, tex)
  }

  tex.fill(1)

  for (let i = 0; i < triangles.length; i += TRIANGLE_SIZE) {
    fillTriangle(
      triangles,
      tex,
      i,
      settings.size,
      settings.size,
      colorMap[i / TRIANGLE_SIZE],
    )
  }

  return diffAndCalculateFitness(imageTex, tex)
}

export function drawTrianglesToTexture(
  width: number,
  height: number,
  triangles: Pos_Buffer,
  colorMap: ColorMapNormalized,
) {
  const tex = new Float32Array(width * height * 3) as RGB_Norm_Buffer
  tex.fill(1)

  for (let i = 0; i < triangles.length; i += TRIANGLE_SIZE) {
    fillTriangle(triangles, tex, i, width, height, colorMap[i / TRIANGLE_SIZE])
  }

  return tex
}

function fillTriangleRGBA(
  triangles: Pos_Buffer,
  tex: RGBA_Norm_Buffer,
  startIndex: number,
  resultCanvasWidth: number,
  resultCanvasHeight: number,
  color: ColorMapItemNormalized,
) {
  const v0x = triangles[startIndex + 0] * resultCanvasWidth
  const v0y = triangles[startIndex + 1] * resultCanvasHeight
  const v1x = triangles[startIndex + 2] * resultCanvasWidth
  const v1y = triangles[startIndex + 3] * resultCanvasHeight
  const v2x = triangles[startIndex + 4] * resultCanvasWidth
  const v2y = triangles[startIndex + 5] * resultCanvasHeight

  const a0 = Math.min(1, Math.max(0, triangles[startIndex + 6]))
  const a0I = 1 - a0

  const r = color[0]
  const g = color[1]
  const b = color[2]

  let minX = Math.floor(Math.min(v0x, v1x, v2x))
  let maxX = Math.ceil(Math.max(v0x, v1x, v2x))
  let minY = Math.floor(Math.min(v0y, v1y, v2y))
  let maxY = Math.ceil(Math.max(v0y, v1y, v2y))

  if (
    minX > resultCanvasWidth - 1 ||
    maxX < 0 ||
    minY > resultCanvasHeight - 1 ||
    maxY < 0
  )
    return

  if (minX < 0) minX = 0
  if (minY < 0) minY = 0
  if (maxX > resultCanvasWidth - 1) maxX = resultCanvasWidth - 1
  if (maxY > resultCanvasHeight - 1) maxY = resultCanvasHeight - 1

  // precalculate the area of the parallelogram defined by our triangle
  let area = cross(v0x, v0y, v1x, v1y, v2x, v2y)

  let ccw = area < 0

  if (ccw) {
    area = Math.abs(area)
  }

  // // calculate edges
  const edge0x = v2x - v1x
  const edge0y = v2y - v1y
  const edge1y = v0y - v2y
  const edge2y = v1y - v0y

  // calculate which edges are right edges so we can easily skip them
  // right edges go up, or (bottom edges) are horizontal edges that go right
  const edgeRight0 = edge0y < 0 || (edge0y == 0 && edge0x > 0)
  const edgeRight1 = edge1y < 0 || (edge1y == 0 && edge0x > 0)
  const edgeRight2 = edge2y < 0 || (edge2y == 0 && edge0x > 0)

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
      // if this is a right or bottom edge, skip fragment (top-left rule):
      if (
        w0 < 0 ||
        w1 < 0 ||
        w2 < 0 ||
        (w0 == 0 && edgeRight0) ||
        (w1 == 0 && edgeRight1) ||
        (w2 == 0 && edgeRight2)
      ) {
        continue
      }

      const index = (y * resultCanvasWidth + x) * 4
      tex[index + 0] = a0I * tex[index + 0] + a0 * r
      tex[index + 1] = a0I * tex[index + 1] + a0 * g
      tex[index + 2] = a0I * tex[index + 2] + a0 * b
      tex[index + 3] = Math.min(1, a0 + tex[index + 3])
    }
  }
}

function fillTriangle(
  triangles: Pos_Buffer,
  tex: RGB_Norm_Buffer,
  startIndex: number,
  resultCanvasWidth: number,
  resultCanvasHeight: number,
  color: ColorMapItemNormalized,
) {
  const v0x = triangles[startIndex + 0] * resultCanvasWidth
  const v0y = triangles[startIndex + 1] * resultCanvasHeight
  const v1x = triangles[startIndex + 2] * resultCanvasWidth
  const v1y = triangles[startIndex + 3] * resultCanvasHeight
  const v2x = triangles[startIndex + 4] * resultCanvasWidth
  const v2y = triangles[startIndex + 5] * resultCanvasHeight

  const a0 = Math.min(1, Math.max(0, triangles[startIndex + 6]))
  const a0I = 1 - a0

  const r = color[0]
  const g = color[1]
  const b = color[2]

  let minX = Math.floor(Math.min(v0x, v1x, v2x))
  let maxX = Math.ceil(Math.max(v0x, v1x, v2x))
  let minY = Math.floor(Math.min(v0y, v1y, v2y))
  let maxY = Math.ceil(Math.max(v0y, v1y, v2y))

  if (
    minX > resultCanvasWidth - 1 ||
    maxX < 0 ||
    minY > resultCanvasHeight - 1 ||
    maxY < 0
  )
    return

  if (minX < 0) minX = 0
  if (minY < 0) minY = 0
  if (maxX > resultCanvasWidth - 1) maxX = resultCanvasWidth - 1
  if (maxY > resultCanvasHeight - 1) maxY = resultCanvasHeight - 1

  // precalculate the area of the parallelogram defined by our triangle
  let area = cross(v0x, v0y, v1x, v1y, v2x, v2y)

  let ccw = area < 0

  if (ccw) {
    area = Math.abs(area)
  }

  // // calculate edges
  const edge0x = v2x - v1x
  const edge0y = v2y - v1y
  const edge1y = v0y - v2y
  const edge2y = v1y - v0y

  // calculate which edges are right edges so we can easily skip them
  // right edges go up, or (bottom edges) are horizontal edges that go right
  const edgeRight0 = edge0y < 0 || (edge0y == 0 && edge0x > 0)
  const edgeRight1 = edge1y < 0 || (edge1y == 0 && edge0x > 0)
  const edgeRight2 = edge2y < 0 || (edge2y == 0 && edge0x > 0)

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
      // if this is a right or bottom edge, skip fragment (top-left rule):
      if (
        w0 < 0 ||
        w1 < 0 ||
        w2 < 0 ||
        (w0 == 0 && edgeRight0) ||
        (w1 == 0 && edgeRight1) ||
        (w2 == 0 && edgeRight2)
      ) {
        continue
      }

      const index = (y * resultCanvasWidth + x) * 3
      tex[index + 0] = a0I * tex[index + 0] + a0 * r
      tex[index + 1] = a0I * tex[index + 1] + a0 * g
      tex[index + 2] = a0I * tex[index + 2] + a0 * b
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

  return diff
}

export function calculateFitnessCircle(
  settings: Settings,
  pos: Pos_Buffer,
  imageTex: RGB_Norm_Buffer,
  colorMap: ColorMapNormalized,
) {
  let tex = cache.get(settings.size)
  if (tex === undefined) {
    tex = new Float32Array(settings.size * settings.size * 3) as RGB_Norm_Buffer
    cache.set(settings.size, tex)
  }

  tex.fill(1)

  drawCirclesToTex(tex, settings.size, settings.size, pos, colorMap)

  return diffAndCalculateFitness(imageTex, tex)
}

export function drawCirclesToNewTex(
  width: number,
  height: number,
  triangles: Pos_Buffer,
  colorMap: ColorMapNormalized,
) {
  const tex = new Float32Array(width * height * 3) as RGB_Norm_Buffer
  tex.fill(1)

  drawCirclesToTex(tex, width, height, triangles, colorMap)
  return tex
}

function drawCirclesToTex(
  tex: RGB_Norm_Buffer,
  width: number,
  height: number,
  triangles: Pos_Buffer,
  colorMap: ColorMapNormalized,
) {
  const err = 0.01

  for (let y = 0; y < height; y++) {
    const yNorm = y / height

    for (let x = 0; x < width; x++) {
      const xNorm = x / width

      for (
        let i = 0, triangleIndex = 0;
        i < triangles.length;
        i += CIRCLE_SIZE, triangleIndex++
      ) {
        const centerX = triangles[i + 0]
        const centerY = triangles[i + 1]
        const radius = triangles[i + 2]
        const a0 = triangles[i + 3]

        const dist = distance(centerX, centerY, xNorm, yNorm)

        if (dist > (1 + err) * radius || radius <= 0) {
          continue
        }

        const r = colorMap[triangleIndex][0]
        const g = colorMap[triangleIndex][1]
        const b = colorMap[triangleIndex][2]
        const alp =
          dist < (1.0 - err) * radius
            ? 1
            : 1.0 - (dist - (1.0 - err) * radius) / (2 * err * radius)

        const totalAlpha = alp * a0
        const totalAlphaI = 1 - totalAlpha

        const index = (y * width + x) * 3
        tex[index + 0] = totalAlphaI * tex[index + 0] + r * totalAlpha
        tex[index + 1] = totalAlphaI * tex[index + 1] + g * totalAlpha
        tex[index + 2] = totalAlphaI * tex[index + 2] + b * totalAlpha
      }
    }
  }
}

export function calculateTriangleFitnessWithPrerender(
  settings: Settings,
  triangles: Pos_Buffer,
  postTriangles: Pos_Buffer,
  prerenderIndex: number,
  imageTex: RGB_Norm_Buffer,
  prerender: RGB_Norm_Buffer,
  colorMap: ColorMapNormalized,
) {
  let tex = cache.get(settings.size)

  if (tex === undefined) {
    tex = new Float32Array(settings.size * settings.size * 3) as RGB_Norm_Buffer
    cache.set(settings.size, tex)
  }

  for (let i = 0; i < tex.length; i++) {
    tex[i] = prerender[i]
  }

  for (let i = 0; i < triangles.length; i += TRIANGLE_SIZE) {
    fillTriangle(
      triangles,
      tex,
      i,
      settings.size,
      settings.size,
      colorMap[(i + prerenderIndex) / TRIANGLE_SIZE],
    )
  }

  for (
    let i = prerenderIndex + triangles.length;
    i < postTriangles.length;
    i += TRIANGLE_SIZE
  ) {
    fillTriangle(
      postTriangles,
      tex,
      i,
      settings.size,
      settings.size,
      colorMap[i / TRIANGLE_SIZE],
    )
  }

  return diffAndCalculateFitness(imageTex, tex)
}
