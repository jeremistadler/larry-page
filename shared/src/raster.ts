let rowMin = new Int32Array(2048)
let rowMax = new Int32Array(2048)

function ensureRowCapacity(n: number) {
  if (n > rowMin.length) {
    let size = rowMin.length
    while (size < n) size *= 2
    rowMin = new Int32Array(size)
    rowMax = new Int32Array(size)
  }
}

function walkEdge(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rowStart: number,
  rowEnd: number,
  yBase: number,
) {
  if (ay === by) return

  if (ay > by) {
    const tx = ax
    const ty = ay
    ax = bx
    ay = by
    bx = tx
    by = ty
  }

  const yLo = Math.ceil(ay)
  const yHi = Math.floor(by)
  const yFrom = yLo < rowStart ? rowStart : yLo
  const yTo = yHi > rowEnd ? rowEnd : yHi
  if (yFrom > yTo) return

  const slope = (bx - ax) / (by - ay)
  let x = ax + slope * (yFrom - ay)
  let r = yFrom - yBase

  for (let y = yFrom; y <= yTo; y++) {
    const xi = x | 0
    if (xi < rowMin[r]) rowMin[r] = xi
    if (xi > rowMax[r]) rowMax[r] = xi
    x += slope
    r++
  }
}

export function drawTriangle(
  buffer: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  g: number,
  b: number,
  alphaI: number,
) {
  let minY = y0 < y1 ? y0 : y1
  if (y2 < minY) minY = y2
  let maxY = y0 > y1 ? y0 : y1
  if (y2 > maxY) maxY = y2

  const yStart = Math.max(0, Math.ceil(minY))
  const yEnd = Math.min(height - 1, Math.floor(maxY))
  if (yStart > yEnd) return

  const rowCount = yEnd - yStart + 1
  ensureRowCapacity(rowCount)

  for (let i = 0; i < rowCount; i++) {
    rowMin[i] = 0x7fffffff
    rowMax[i] = -0x7fffffff
  }

  walkEdge(x0, y0, x1, y1, yStart, yEnd, yStart)
  walkEdge(x1, y1, x2, y2, yStart, yEnd, yStart)
  walkEdge(x2, y2, x0, y0, yStart, yEnd, yStart)

  const invAlpha = 256 - alphaI
  const rPre = r * alphaI
  const gPre = g * alphaI
  const bPre = b * alphaI

  for (let row = 0; row < rowCount; row++) {
    let xL = rowMin[row]
    let xR = rowMax[row]
    if (xL > xR) continue
    if (xL < 0) xL = 0
    if (xR > width - 1) xR = width - 1
    if (xL > xR) continue

    const y = yStart + row
    let idx = (y * width + xL) * 4
    for (let x = xL; x <= xR; x++) {
      buffer[idx] = (rPre + buffer[idx] * invAlpha) >> 8
      buffer[idx + 1] = (gPre + buffer[idx + 1] * invAlpha) >> 8
      buffer[idx + 2] = (bPre + buffer[idx + 2] * invAlpha) >> 8
      idx += 4
    }
  }
}
