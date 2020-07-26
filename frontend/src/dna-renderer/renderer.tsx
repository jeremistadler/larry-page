import * as React from 'react'
import {Utils} from 'shared/src/utils'
import {DnaApi} from './../scripts/api'
import {Dna, ISettings} from 'shared/src/dna'
import {JsRasterizer} from '../scripts/rasterizer'
import './renderer.css'
import {
  drawDnaOnCanvas,
  drawFitnessDiffOnCanvas,
} from '../scripts/drawDnaOnCanvas'

function rollingAvg(old: number, newValue: number, partOfNew: number) {
  return old * (1 - partOfNew) + newValue * partOfNew
}

function DnaRenderer(props: {dna: Dna | null}) {
  const originalDna = props.dna

  const [settings, setSettings] = React.useState<ISettings>({
    newMinOpacity: 0.1,
    newMaxOpacity: 1,

    iterations: 1,

    saveInterval: 10,
    updateScreenInterval: 100,

    size: 128,

    workerThreads: 1,
  })

  const [rasterizer, setRasterizer] = React.useState<JsRasterizer | null>(null)
  const [updatedDna, updateDna] = React.useState<Dna | null>(null)
  const dnaOrEmpty = updatedDna ?? originalDna ?? Utils.createDna(0, '')
  const originalOrNewDna = updatedDna ?? originalDna

  const width = 256
  const height =
    256 * (dnaOrEmpty.sourceImageWidth / dnaOrEmpty.sourceImageHeight)

  const lastDnaUpdateTime = React.useRef(0)
  const lastDnaGenerations = React.useRef(0)
  const lastDnaMutations = React.useRef(0)
  const lastFitness = React.useRef(0)
  const generationsPerSecond = React.useRef(0)
  const mutationsPerSecond = React.useRef(0)
  const fitnessPerSecond = React.useRef(0)

  const now = Date.now()

  if (lastDnaUpdateTime.current === 0 && updatedDna) {
    lastDnaUpdateTime.current = now
    lastDnaGenerations.current = updatedDna.generation
    lastDnaMutations.current = updatedDna.mutation
    lastFitness.current = updatedDna.fitness
  } else if (updatedDna) {
    const secondsPassed = (now - lastDnaUpdateTime.current) / 1000

    if (secondsPassed > 0) {
      generationsPerSecond.current = rollingAvg(
        generationsPerSecond.current,
        (updatedDna.generation - lastDnaGenerations.current) / secondsPassed,
        0.1,
      )

      mutationsPerSecond.current = rollingAvg(
        mutationsPerSecond.current,
        (updatedDna.mutation - lastDnaMutations.current) / secondsPassed,
        0.1,
      )

      fitnessPerSecond.current = rollingAvg(
        fitnessPerSecond.current,
        (lastFitness.current - updatedDna.fitness) / secondsPassed,
        0.1,
      )

      lastDnaUpdateTime.current = now
      lastDnaGenerations.current = updatedDna.generation
      lastDnaMutations.current = updatedDna.mutation
      lastFitness.current = updatedDna.fitness
    }
  }

  const dnaUpdated = (dna: Dna) => {
    requestAnimationFrame(() => updateDna(dna))
  }

  React.useEffect(() => {
    if (!originalOrNewDna) return

    let isMounted = true
    let rasterizer: null | JsRasterizer = null

    DnaApi.loadAndScaleImageData(
      originalOrNewDna,
      settings.size,
      settings.size,
    ).then(imageData => {
      if (!isMounted) return

      rasterizer = new JsRasterizer(imageData, originalOrNewDna, settings)
      rasterizer.onFrameCompleted.push(dnaUpdated)
      setRasterizer(rasterizer)
      dnaUpdated(originalOrNewDna)
    })

    return () => {
      isMounted = false
      if (rasterizer) rasterizer.Stop()
    }
  }, [originalOrNewDna, settings])

  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const fitnessCanvasRef = React.useRef<HTMLCanvasElement>(null)
  const originalCanvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (updatedDna) {
      let ctx = canvasRef.current?.getContext('2d')
      if (ctx && rasterizer) {
        drawDnaOnCanvas(ctx, updatedDna ?? dnaOrEmpty)
      }

      ctx = fitnessCanvasRef.current?.getContext('2d')
      if (ctx && rasterizer) {
        drawFitnessDiffOnCanvas(
          ctx,
          updatedDna ?? dnaOrEmpty,
          rasterizer.source,
        )
      }

      ctx = originalCanvasRef.current?.getContext('2d')
      if (ctx && rasterizer) {
        ctx.putImageData(rasterizer.source, 0, 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedDna, settings])

  return (
    <div className="renderer-container">
      <div className="renderer-inner-container">
        <p className="renderer-header">Currently rendering</p>
        <div className="renderer-image">
          <canvas ref={canvasRef} width={width} height={height} />
        </div>
        <div className="renderer-image">
          <canvas
            ref={fitnessCanvasRef}
            width={settings.size}
            height={settings.size}
          />
        </div>
        <div className="renderer-image">
          <canvas
            ref={originalCanvasRef}
            width={settings.size}
            height={settings.size}
          />
        </div>

        <div className="renderer-text-container">
          <p>
            Genes / triangles:{' '}
            <span className="renderer-value-text">
              {dnaOrEmpty.genes.length}
            </span>
          </p>
          <p>
            Generation:{' '}
            <span className="renderer-value-text">{dnaOrEmpty.generation}</span>
          </p>
          <p>
            Mutation:{' '}
            <span className="renderer-value-text">{dnaOrEmpty.mutation}</span>
          </p>
          <p>
            Fitness:{' '}
            <span className="renderer-value-text">
              {((1 - dnaOrEmpty.fitness / 65536) * 100).toFixed(2)} %
            </span>
          </p>
          {/*       <p>
            Weights:{' '}
            <span className="renderer-value-text">
              {settings.mutatorWeights
                .map(f => Math.round(f * 10) / 10)
                .join(', ')}
            </span>
          </p> */}
          <p>
            Speed:{' '}
            <span className="renderer-value-text">
              {mutationsPerSecond.current.toFixed(1)} mutations/s{' '}
            </span>
            <span className="renderer-value-text">
              {generationsPerSecond.current.toFixed(1)} generations/s{' '}
            </span>
            <span className="renderer-value-text">
              {fitnessPerSecond.current.toFixed(1)} fitness/s{' '}
            </span>
          </p>

          <button onClick={() => rasterizer?.nudge()}>Nudge</button>
          <button
            onClick={() =>
              setSettings({...settings, size: settings.size - 32})
            }>
            Lower resolution
          </button>
          <button
            onClick={() =>
              setSettings({...settings, size: settings.size + 32})
            }>
            Higher resolution
          </button>
        </div>
      </div>
    </div>
  )
}

export default DnaRenderer
