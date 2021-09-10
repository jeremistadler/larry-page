export function getOptimalTextureSize(generations: number) {
  if (generations < 10_000) return 64
  if (generations < 1_000_000) return 128
  if (generations < 2_000_000) return 256
  if (generations < 3_000_000) return 512
  return 1024
}

export const MAX_GENERATIONS_PER_LEVEL = 40_000
export const GENERATIONS_PER_SAVE = 120_000
export const GENERATIONS_PER_EXIT = 500_000
