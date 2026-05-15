import {useState, useEffect, useRef} from 'react'
import {Dna, ISettings, geneCount} from 'shared/src/dna'
import {JsRasterizer} from '../scripts/rasterizer'
import './renderer.css'
import {
  drawDnaOnCanvas,
  drawFitnessDiffOnCanvas,
} from '../scripts/drawDnaOnCanvas'

function DnaRenderer({
  dna,
  onDnaChanged,
}: {
  dna: Dna
  onDnaChanged: (dn: Dna) => void
}) {
  const dnaId = dna.id
  const [settings, setSettings] = useState<ISettings>({
    newMinOpacity: 0.1,
    newMaxOpacity: 1,

    saveInterval: 10,
    updateScreenInterval: 500,

    size: 128,

    workerThreads: 1,

    maxGenes: 300,
    genesPerGeneration: 0.00001,
  })

  const width = 256
  const height = 256 * (dna.sourceImageHeight / dna.sourceImageWidth)

  // const dnaUpdated = (dna: Dna) => {
  //   dnaRef.current = dna
  //   requestAnimationFrame(() => updateDna(dna))
  // }

  const rasterizerRef = useRef<JsRasterizer | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fitnessCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const rasterizer = (rasterizerRef.current = new JsRasterizer(dna, settings))

    rasterizer.onFrameCompleted.push(onDnaChanged)

    return () => {
      rasterizer.Stop()
    }
  }, [dnaId, settings])

  useEffect(() => {
    const rasterizer = rasterizerRef.current

    if (rasterizer == null) return

    let ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      drawDnaOnCanvas(ctx, dna)
    }

    ctx = fitnessCanvasRef.current?.getContext('2d')
    if (ctx && rasterizer.source != null) {
      drawFitnessDiffOnCanvas(ctx, dna, rasterizer.source)
    }

    ctx = originalCanvasRef.current?.getContext('2d')
    if (ctx && rasterizer.source != null) {
      ctx.putImageData(rasterizer.source, 0, 0)
    }
  }, [dna, settings])

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
            Triangles:{' '}
            <span className="renderer-value-text">{geneCount(dna)}</span>
          </p>
          <p>
            Tested placements:{' '}
            <span className="renderer-value-text">{dna.testedPlacements}</span>
          </p>
          <p>
            Fitness:{' '}
            <span className="renderer-value-text">
              {((1 - dna.fitness / 65536) * 100).toFixed(2)} %
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
          {/* <p>
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
          </p> */}

          <button onClick={() => rasterizerRef.current?.nudge()}>Nudge</button>
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
