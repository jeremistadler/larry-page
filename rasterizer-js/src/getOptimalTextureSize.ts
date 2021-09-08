export function getOptimalTextureSize(generations: number) {
  if (generations < 10000) return 64
  if (generations < 1000000) return 128
  if (generations < 2000000) return 256
  if (generations < 3000000) return 512
  return 1024
}
