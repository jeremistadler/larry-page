import {DomainBounds} from './micro.js'

export function randomNumberBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function randomNumberBounds(bounds: DomainBounds) {
  return Math.random() * (bounds[1] - bounds[0]) + bounds[0]
}
