import {DomainBounds} from './micro.js'

export function createBounds(
  itemCount: number,
  type: 'triangle' | 'circle',
): DomainBounds[] {
  return Array.from({
    length: itemCount,
  })
    .map((_, i): DomainBounds[] => {
      if (type === 'circle')
        return [
          [0, 1],
          [0, 1],
          [0.05, 0.2],
          [0.1, 0.4], // alpha
        ]

      return [
        [0.05, 0.95],
        [0.05, 0.95],
        [0.05, 0.95],
        [0.05, 0.95],
        [0.05, 0.95],
        [0.05, 0.95],
        [0.1, 0.8], // a
      ]
    })
    .flat(1)
}
