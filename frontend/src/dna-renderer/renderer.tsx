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
  const dnaRef = React.useRef(originalOrNewDna)

  const width = 256
  const height =
    256 * (dnaOrEmpty.sourceImageHeight / dnaOrEmpty.sourceImageWidth)

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
    lastDnaGenerations.current = updatedDna.triedChanges
    lastDnaMutations.current = updatedDna.changedTriangles
    lastFitness.current = updatedDna.fitness
  } else if (updatedDna) {
    const secondsPassed = (now - lastDnaUpdateTime.current) / 1000

    if (secondsPassed > 0) {
      generationsPerSecond.current = rollingAvg(
        generationsPerSecond.current,
        (updatedDna.triedChanges - lastDnaGenerations.current) / secondsPassed,
        0.1,
      )

      mutationsPerSecond.current = rollingAvg(
        mutationsPerSecond.current,
        (updatedDna.changedTriangles - lastDnaMutations.current) /
          secondsPassed,
        0.1,
      )

      fitnessPerSecond.current = rollingAvg(
        fitnessPerSecond.current,
        (lastFitness.current - updatedDna.fitness) / secondsPassed,
        0.1,
      )

      lastDnaUpdateTime.current = now
      lastDnaGenerations.current = updatedDna.triedChanges
      lastDnaMutations.current = updatedDna.changedTriangles
      lastFitness.current = updatedDna.fitness
    }
  }

  const dnaUpdated = (dna: Dna) => {
    dnaRef.current = dna
    requestAnimationFrame(() => updateDna(dna))
  }

  React.useEffect(() => {
    if (!originalDna) return

    let isMounted = true
    let rasterizer: null | JsRasterizer = null

    DnaApi.loadAndScaleImageData(
      dnaRef.current || originalDna,
      settings.size,
      settings.size,
    ).then(imageData => {
      if (!isMounted) return

      rasterizer = new JsRasterizer(
        imageData,
        dnaRef.current || originalDna,
        settings,
      )
      rasterizer.onFrameCompleted.push(dnaUpdated)
      setRasterizer(rasterizer)
      dnaUpdated(dnaRef.current || originalDna)
    })

    return () => {
      isMounted = false
      if (rasterizer) rasterizer.Stop()
    }
  }, [originalDna, settings])

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
              {dnaOrEmpty.triangles.length}
            </span>
          </p>
          <p>
            Generation:{' '}
            <span className="renderer-value-text">
              {dnaOrEmpty.triedChanges}
            </span>
          </p>
          <p>
            Mutation:{' '}
            <span className="renderer-value-text">
              {dnaOrEmpty.changedTriangles}
            </span>
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
