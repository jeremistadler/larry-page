import * as React from 'react'
import {Utils} from 'shared/src/utils'
import {DnaApi} from './../scripts/api'
import {RenderConfig} from 'shared/src/shared'
import {Dna} from 'shared/src/dna'
import {GeneMutator} from 'shared/src/gene-mutator'
import {JsRasterizer} from '../scripts/rasterizer'
import './renderer.css'

function DnaRenderer(props: {dna: Dna | null}) {
  const {dna} = props
  const dnaOrEmpty = dna ?? Utils.createDna(0, '')

  const [settings] = React.useState({
    minGridSize: 1,
    maxGridSize: 3,

    newMinOpacity: 0.1,
    newMaxOpacity: 1,

    autoAdjustMutatorWeights: true,
    mutatorWeights: Utils.CreateNumberArray(GeneMutator.GeneMutators.length),
    iterations: 50,
  })

  const [rasterizer, setRasterizer] = React.useState<JsRasterizer | null>(null)
  const [, generation] = React.useState(0)

  const ratioW = 500 / dnaOrEmpty.organism.width
  const ratioH = 300 / dnaOrEmpty.organism.height
  const ratio = ratioW < ratioH ? ratioW : ratioH

  const width = dnaOrEmpty.organism.width * ratio
  const height = dnaOrEmpty.organism.height * ratio

  const dnaUpdated = (dna: Dna) => {
    requestAnimationFrame(() => generation(dna.mutation))
  }

  React.useEffect(() => {
    if (!dna) return

    let isMounted = true
    let rasterizer: null | JsRasterizer = null

    DnaApi.loadAndScaleImageData(
      dna,
      RenderConfig.globalWidth,
      RenderConfig.globalHeight,
    ).then(imageData => {
      if (!isMounted) return

      rasterizer = new JsRasterizer(imageData, dna, settings)
      rasterizer.onFrameCompleted.push(dnaUpdated)
      setRasterizer(rasterizer)
      dnaUpdated(dna)
    })

    return () => {
      isMounted = false
      if (rasterizer) rasterizer.Stop()
    }
  }, [dna, settings])

  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (dna) {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx && rasterizer) {
        rasterizer.drawCurrentWorkersOnCanvas(ctx)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dna, dna?.mutation, settings])

  return (
    <div className="renderer-container">
      <div className="renderer-inner-container">
        <p className="renderer-header">Currently rendering</p>
        <div className="renderer-image">
          <canvas ref={canvasRef} width={width} height={height} />
        </div>

        <div className="renderer-text-container">
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
            <span className="renderer-value-text">{dnaOrEmpty.fitness}</span>
          </p>
          <p>
            Weights:{' '}
            <span className="renderer-value-text">
              {settings.mutatorWeights
                .map(f => Math.round(f * 10) / 10)
                .join(', ')}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default DnaRenderer
