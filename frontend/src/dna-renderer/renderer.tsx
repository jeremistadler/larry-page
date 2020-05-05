import * as React from 'react'
import {Utils} from 'shared/src/utils'
import {DnaApi} from './../scripts/api'
import {RenderConfig} from 'shared/src/shared'
import {Dna} from 'shared/src/dna'
import {GeneMutator} from 'shared/src/gene-mutator'
import {JsRasterizer} from '../scripts/rasterizer'
import DnaImage from '../dna-image/dna-image'
import './renderer.css'
import {useDebouncedCallback} from 'use-debounce'

function DnaRenderer() {
  const [settings] = React.useState({
    minGridSize: 1,
    maxGridSize: 3,

    newMinOpacity: 0.1,
    newMaxOpacity: 1,

    autoAdjustMutatorWeights: true,
    mutatorWeights: Utils.CreateNumberArray(GeneMutator.GeneMutators.length),
    iterations: 50,
  })

  const [width, setWidth] = React.useState(200)
  const [height, setHeight] = React.useState(200)
  let [dna, setDna] = React.useState<Dna | null>(null)
  const [_, setRasterizer] = React.useState<JsRasterizer | null>(null)
  const [s, ss] = React.useState(0)

  const dnaUpdated = (dna: Dna) => {
    var ratioW = 500 / dna.Organism.Width
    var ratioH = 300 / dna.Organism.Height
    var ratio = ratioW < ratioH ? ratioW : ratioH

    var width = dna.Organism.Width * ratio
    var height = dna.Organism.Height * ratio

    requestAnimationFrame(() => {
      setWidth(width)
      setHeight(height)
      setDna(dna)
      ss(dna.Generation)
    })
  }

  const changeSourceDna = (dna: Dna) => {
    dnaUpdated(dna)

    DnaApi.loadAndScaleImageData(
      dna,
      RenderConfig.globalWidth,
      RenderConfig.globalHeight,
    ).then(image => {
      //if(window.devicePixelRatio) return;
      const rasterizer = new JsRasterizer(image, dna, settings)
      rasterizer.onFrameCompleted.push(dna => {
        dnaUpdated(dna)
      })
      setRasterizer(rasterizer)
    })
  }

  React.useEffect(() => {
    DnaApi.fetchRandomDna().then(dna => {
      changeSourceDna(dna)
    })
  }, [])

  if (!dna) dna = Utils.createDna(0, '')

  return (
    <div className="renderer-container">
      <div className="renderer-inner-container">
        <p className="renderer-header">Currently rendering</p>
        <div className="renderer-image">
          <DnaImage dna={dna} width={width} height={height} />
        </div>
        <div className="renderer-text-container">
          <p>
            Generation:{' '}
            <span className="renderer-value-text">{dna.Generation}</span>
          </p>
          <p>
            Mutation:{' '}
            <span className="renderer-value-text">{dna.Mutation}</span>
          </p>
          <p>
            Fitness: <span className="renderer-value-text">{dna.Fitness}</span>
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
