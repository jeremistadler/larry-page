import {OptimizerType} from './micro'

type StartProps = {
  sliceSize: number
  optimizerType: OptimizerType
  featureCount: number
  generationsUsed: number
  fitness: number
}

type ResultBucket = {
  featureCount: number
  sliceSize: number
  optimizerType: OptimizerType
  runs: {
    fitnessImprovement: number
    generationsUsed: number
  }[]
}

function toKey(options: StartProps) {
  return [options.optimizerType, options.featureCount, options.sliceSize].join(
    '-',
  )
}

export function createStatsAggregator() {
  let startProps: StartProps | null = null
  const buckets = new Map<string, ResultBucket>()

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
        console.error('Called levelCompleted before levelStart')
        return
      }

      const key = toKey(startProps)
      let bucket = buckets.get(key)
      if (bucket == null) {
        bucket = {
          featureCount: startProps.featureCount,
          optimizerType: startProps.optimizerType,
          sliceSize: startProps.sliceSize,
          runs: [],
        }
        buckets.set(key, bucket)
      }

      bucket.runs.push({
        fitnessImprovement: startProps.fitness - options.fitness,
        generationsUsed: startProps.generationsUsed - options.generationsUsed,
      })

      startProps = null
    },
  }
}
