const SIZE = 255

@inline
function getPixelIndex(DATA_POINTER: i32, x: i32, y: i32, comp: i32): i32 {
  assert(x >= 0, 'getPixelIndex x is too low')
  assert(x < SIZE, 'getPixelIndex x is too high')
  assert(y >= 0, 'getPixelIndex y is too low')
  assert(y < SIZE, 'getPixelIndex y is too high')
  assert(comp >= 0, 'getPixelIndex comp is too low')
  assert(comp <= 2, 'getPixelIndex comp is too high')

  return DATA_POINTER + ((y * SIZE + x) * 3 + comp) * 4
}

@inline
function getMinMaxIndex(DATA_POINTER: i32, y: i32, comp: i32): i32 {
  assert(y >= 0, 'getMinMaxIndex y is too low')
  assert(y < SIZE, 'getMinMaxIndex y is too high')
  assert(comp >= 0, 'getMinMaxIndex comp is too low')
  assert(comp <= 1, 'getMinMaxIndex comp is too high')

  return DATA_POINTER + (y * 2 + comp)
}

@inline
function edgeFunction(
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  cx: f32,
  cy: f32,
): boolean {
  return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax) >= 0
}

@inline
function orient2dfast(
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  cx: f32,
  cy: f32,
): f32 {
  return (ay - cy) * (bx - cx) - (ax - cx) * (by - cy)
}

export function baryRenderer(
  DATA_POINTER: i32,
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  cx: f32,
  cy: f32,
): void {
  let maxX: f32 = ax
  if (bx > maxX) maxX = bx
  if (cx > maxX) maxX = cx

  let minX: f32 = ax
  if (bx < minX) minX = bx
  if (cx < minX) minX = cx

  let minY: f32 = ay
  if (by < minY) minY = by
  if (cy < minY) minY = cy

  let maxY: f32 = ay
  if (by > maxY) maxY = by
  if (cy > maxY) maxY = cy

  const polygonWidth: f32 = maxX - minX
  const polygonHeight: f32 = maxY - minY

  trace(polygonWidth.toString() + ' x ' + polygonHeight.toString())

  if (polygonHeight === 0) return
  if (polygonWidth === 0) return

  const A01: f32 = ay - by
  const B01: f32 = bx - ax
  const A12: f32 = by - cy
  const B12: f32 = cx - bx
  const A20: f32 = cy - ay
  const B20: f32 = ax - cx

  // Barycentric coordinates at minX/minY corner
  let px: f32 = minX
  let py: f32 = minY
  let w0_row: f32 = orient2dfast(bx, by, cx, cy, px, py)
  let w1_row: f32 = orient2dfast(cx, cy, ax, ay, px, py)
  let w2_row: f32 = orient2dfast(ax, ay, bx, by, px, py)

  // Rasterize
  for (py = minY; py <= maxY; py++) {
    // Barycentric coordinates at start of row
    let w0: f32 = w0_row
    let w1: f32 = w1_row
    let w2: f32 = w2_row

    for (px = minX; px <= maxX; px++) {
      // If p is on or inside all edges, render pixel.
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
        trace('x: ' + px.toString() + ', y: ' + py.toString())

        const index = getPixelIndex(DATA_POINTER, <i32>px, <i32>py, 0)
        store<f32>(index, 1.0)
        //renderPixel(p, w0, w1, w2)
      }

      // One step to the right
      w0 += A12
      w1 += A20
      w2 += A01
    }

    // One row step
    w0_row += B12
    w1_row += B20
    w2_row += B01
  }
}

export function calcMinMax(
  minMaxPointer: i32,

  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  cx: f32,
  cy: f32,
): void {
  let maxX: f32 = ax
  if (bx > maxX) maxX = bx
  if (cx > maxX) maxX = cx

  let minX: f32 = ax
  if (bx < minX) minX = bx
  if (cx < minX) minX = cx

  let minY: f32 = ay
  if (by < minY) minY = by
  if (cy < minY) minY = cy

  let maxY: f32 = ay
  if (by > maxY) maxY = by
  if (cy > maxY) maxY = cy

  const polygonWidth: f32 = maxX - minX
  const polygonHeight: f32 = maxY - minY

  // trace(
  //   'Width: ' +
  //     polygonWidth.toString() +
  //     ', ' +
  //     minX.toString() +
  //     ' - ' +
  //     maxX.toString(),
  // )

  // trace(
  //   'Height: ' +
  //     polygonHeight.toString() +
  //     ', ' +
  //     minY.toString() +
  //     ' - ' +
  //     maxY.toString(),
  // )

  if (polygonHeight === 0) return
  if (polygonWidth === 0) return

  scanlineFloat(minMaxPointer, ax, ay, bx, by, minY, maxY)
  scanlineFloat(minMaxPointer, cx, cy, ax, ay, minY, maxY)
  scanlineFloat(minMaxPointer, bx, by, cx, cy, minY, maxY)
}

export function rasterizeTriangle(
  DATA_POINTER: i32,
  minMaxPointer: i32,

  ax: i32,
  ay: i32,
  bx: i32,
  by: i32,
  cx: i32,
  cy: i32,

  colorR: f32,
  colorG: f32,
  colorB: f32,
  colorA: f32,
): void {
  // TODO Do we need this?
  // for (let i = 0; i < SIZE * SIZE * 3; i++) {
  //   store<f32>(DATA_POINTER + i * 4, 0)
  // }

  // store<f32>(getPixelIndex(DATA_POINTER, 0, 0, 0), 1)
  // store<f32>(getPixelIndex(DATA_POINTER, 1, 1, 1), 0.8)
  // store<f32>(getPixelIndex(DATA_POINTER, 2, 2, 2), 1)
  // store<f32>(getPixelIndex(DATA_POINTER, 3, 3, 0), 1)
  // store<f32>(getPixelIndex(DATA_POINTER, 4, 4, 0), 1)

  // return

  let maxX: i32 = ax
  if (bx > maxX) maxX = bx
  if (cx > maxX) maxX = cx

  let minX: i32 = ax
  if (bx < minX) minX = bx
  if (cx < minX) minX = cx

  let minY: i32 = ay
  if (by < minY) minY = by
  if (cy < minY) minY = cy

  let maxY: i32 = ay
  if (by > maxY) maxY = by
  if (cy > maxY) maxY = cy

  const polygonWidth: i32 = maxX - minX
  const polygonHeight: i32 = maxY - minY

  //trace(polygonWidth.toString() + ' x ' + polygonHeight.toString())

  if (polygonHeight === 0) return
  if (polygonWidth === 0) return

  scanline(minMaxPointer, ax, ay, bx, by, minY, maxY)
  scanline(minMaxPointer, cx, cy, ax, ay, minY, maxY)
  scanline(minMaxPointer, bx, by, cx, cy, minY, maxY)

  for (var globalY = 0; globalY < SIZE; globalY++) {
    drawHLine(
      DATA_POINTER,
      <i32>load<u8>(getMinMaxIndex(minMaxPointer, globalY, 0)),
      <i32>load<u8>(getMinMaxIndex(minMaxPointer, globalY, 1)),
      globalY,
      colorR,
      colorG,
      colorB,
      colorA,
    )
  }
}

export function rasterizeFloat(
  DATA_POINTER: i32,
  minMaxPointer: i32,

  colorR: f32,
  colorG: f32,
  colorB: f32,
  colorA: f32,
): void {
  for (var globalY = 0; globalY < SIZE; globalY++) {
    drawHLine(
      DATA_POINTER,
      <i32>load<u8>(getMinMaxIndex(minMaxPointer, globalY, 0)),
      <i32>load<u8>(getMinMaxIndex(minMaxPointer, globalY, 1)),
      globalY,
      colorR,
      colorG,
      colorB,
      colorA,
    )
  }
}

function scanlineFloat(
  minMaxPointer: i32,
  x1: f32,
  y1: f32,
  x2: f32,
  y2: f32,
  startY: f32,
  endY: f32,
): void {
  if (y1 === y2) return

  if (y1 > y2) {
    let tempY: f32 = y1
    let tempX: f32 = x1
    y1 = y2
    y2 = tempY
    x1 = x2
    x2 = tempX
  }

  if (endY < y2) y2 = endY
  //if ( y2 < y1 ) { y2++ }

  if (y1 === y2) return

  let x: f32 = <f32>x1
  var dx: f32 = (<f32>x2 - x) / (<f32>y2 - <f32>y1) // change in x over change in y will give us the gradient
  var row: i32 = <i32>y1 // the offset the start writing at (into the array)

  //trace(y1.toString() + ' ' + y2.toString() + ' dx: ' + dx.toString())

  for (; y1 <= y2; y1++) {
    const xByte: u8 = <u8>x
    //trace(y1.toString() + ' ' + ' val: ' + xByte.toString())

    if (row >= 0 && load<u8>(getMinMaxIndex(minMaxPointer, row, 0)) > xByte)
      store<u8>(getMinMaxIndex(minMaxPointer, row, 0), xByte)

    if (row >= 0 && load<u8>(getMinMaxIndex(minMaxPointer, row, 1)) < xByte)
      store<u8>(getMinMaxIndex(minMaxPointer, row, 1), xByte)

    x += dx
    row++

    if (row > SIZE - 1) break
  }
}

function scanline(
  minMaxPointer: i32,
  x1: i32,
  y1: i32,
  x2: i32,
  y2: i32,
  startY: i32,
  endY: i32,
): void {
  if (y1 === y2) return

  if (y1 > y2) {
    let tempY: i32 = y1
    let tempX: i32 = x1
    y1 = y2
    y2 = tempY
    x1 = x2
    x2 = tempX
  }

  if (endY < y2) y2 = endY
  //if ( y2 < y1 ) { y2++ }

  trace(y1.toString() + ' ' + y2.toString())

  if (y1 === y2) return

  let x: f32 = <f32>x1
  var dx: f32 = (<f32>x2 - x) / (<f32>y2 - <f32>y1) // change in x over change in y will give us the gradient
  var row = y1 // the offset the start writing at (into the array)

  trace(y1.toString() + ' ' + y2.toString() + ' dx: ' + dx.toString())

  for (; y1 <= y2; y1++) {
    const xByte: u8 = <u8>x
    trace(y1.toString() + ' ' + ' val: ' + xByte.toString())

    if (row > 0 && load<u8>(getMinMaxIndex(minMaxPointer, row, 0)) > xByte)
      store<u8>(getMinMaxIndex(minMaxPointer, row, 0), xByte)

    if (row > 0 && load<u8>(getMinMaxIndex(minMaxPointer, row, 1)) < xByte)
      store<u8>(getMinMaxIndex(minMaxPointer, row, 1), xByte)

    x += dx
    row++

    if (row > SIZE - 1) break
  }
}

function drawHLine(
  buffer: i32,
  x1: i32,
  x2: i32,
  y: i32,
  colorR: f32,
  colorG: f32,
  colorB: f32,
  colorA: f32,
): void {
  if (0 > x1) x1 = 0
  if (x2 > SIZE) x2 = SIZE

  const inverseAlpha: f32 = 1.0 - colorA
  let index: i32 = 0

  for (; x1 < x2; x1++) {
    index = getPixelIndex(buffer, x1, y, 0)
    store<f32>(index, colorA * colorR + load<f32>(index) * inverseAlpha)

    index = getPixelIndex(buffer, x1, y, 1)
    store<f32>(index, colorA * colorG + load<f32>(index) * inverseAlpha)

    index = getPixelIndex(buffer, x1, y, 2)
    store<f32>(index, colorA * colorB + load<f32>(index) * inverseAlpha)
  }
}
