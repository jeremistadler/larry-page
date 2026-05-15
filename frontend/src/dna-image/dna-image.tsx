import {Dna, GENE_FLOATS, geneCount} from 'shared/src/dna'
import './dna-image.css'

function DnaImage({
  dna,
  width,
  height,
  index,
}: {
  dna: Dna
  width: number
  height: number
  index: number
}) {
  if (!dna || !dna.genes || dna.genes.length === 0) {
    var emptyStyle = {
      width: width + 'px',
      height: height + 'px',
      display: 'inline-block',
    }
    return <div style={emptyStyle}></div>
  }

  var animationLength = 5
  const count = geneCount(dna)
  var lengthPerPoly = animationLength / count
  const genes = dna.genes

  const polygons = []
  for (let i = 0; i < count; i++) {
    const off = i * GENE_FLOATS
    const points =
      genes[off + 0] * width +
      ',' +
      genes[off + 1] * height +
      ' ' +
      genes[off + 2] * width +
      ',' +
      genes[off + 3] * height +
      ' ' +
      genes[off + 4] * width +
      ',' +
      genes[off + 5] * height

    const color =
      'rgba(' +
      Math.floor(genes[off + 6] * 255) +
      ',' +
      Math.floor(genes[off + 7] * 255) +
      ',' +
      Math.floor(genes[off + 8] * 255) +
      ',' +
      genes[off + 9] +
      ')'

    polygons.push(
      <polygon
        points={points}
        style={{
          fill: color,
          stroke: 'none',
          animationDelay: i * lengthPerPoly + 's',
        }}
        key={i}
      />,
    )
  }

  return (
    <svg height={height} width={width}>
      <rect width={width} height={height} fill="white" />
      {polygons}
    </svg>
  )
}

export default DnaImage
