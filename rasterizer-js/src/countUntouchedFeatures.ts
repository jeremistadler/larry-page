import {DomainBounds, Pos_Buffer} from './micro.js'

export function countUntouchedFeatures(
  pos: Pos_Buffer,
  bounds: DomainBounds[],
) {
  let count = 0

  for (let i = pos.length - 1; i >= 0; i--) {
    if (pos[i] === bounds[i][0]) {
      count++
    } else {
      return count
    }
  }
  return count
}
