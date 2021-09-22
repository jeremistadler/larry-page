import {OptimizerType} from './micro'

type StartProps = {
  sliceStart: number
  sliceSize: number
  optimizerType: OptimizerType
  featureCount: number
  generationsUsed: number
  fitness: number
  itemSize: number
}

type ResultBucket = {
  featureCount: number
  sliceSize: number
  sliceStart: number
  itemSize: number
  optimizerType: OptimizerType
  runs: {
    fitnessImprovement: number
    generationsUsed: number
  }[]
}

function toKey(options: StartProps) {
  return [
    options.optimizerType,
    options.featureCount,
    options.sliceSize,
    options.sliceStart,
  ].join('-')
}

export function createStatsAggregator() {
  let startProps: StartProps | null = null
  const buckets = new Map<string, ResultBucket>()

  const print = () => {
    console.log(
      [...buckets.values()]
        .sort(
          (a, b) =>
            a.optimizerType.localeCompare(b[0]) ||
            a.featureCount - b.featureCount ||
            a.sliceSize - b.sliceSize ||
            a.sliceStart - b.sliceStart,
        )
        .map(bucket => {
          const fitnessImp =
            bucket.runs.reduce((a, b) => a + b.fitnessImprovement, 0) * 100000
          const samples = bucket.runs.reduce((a, b) => a + b.generationsUsed, 0)

          return `${bucket.optimizerType}: ${
            bucket.sliceStart / bucket.itemSize
          } - ${(bucket.sliceStart + bucket.sliceSize) / bucket.itemSize} (${
            bucket.featureCount / bucket.itemSize
          }) fitness/samples: ${(fitnessImp / samples).toFixed(0)}`
        })
        .join('\n'),
    )
  }

  return {
    levelStart: (options: StartProps) => {
      startProps = options
    },
    levelCompleted: (options: {
      generationsUsed: number
      fitness: number
      sliceSize: number
    }) => {
      if (startProps == null) {
        return
      }

      const key = toKey(startProps)
      let bucket = buckets.get(key)
      if (bucket == null) {
        bucket = {
          featureCount: startProps.featureCount,
          optimizerType: startProps.optimizerType,
          sliceSize: startProps.sliceSize,
          sliceStart: startProps.sliceStart,
          itemSize: startProps.itemSize,
          runs: [],
        }
        buckets.set(key, bucket)
      }

      bucket.runs.push({
        fitnessImprovement: startProps.fitness - options.fitness,
        generationsUsed: options.generationsUsed - startProps.generationsUsed,
      })

      startProps = null

      print()
    },
  }
}
