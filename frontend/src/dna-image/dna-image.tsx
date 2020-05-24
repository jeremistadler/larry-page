import * as React from 'react'
import {Dna} from 'shared/src/dna'
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
  if (!dna || !dna.genes) {
    var style = {
      width: width + 'px',
      height: height + 'px',
      display: 'inline-block',
    }
    return <div style={style}></div>
  }

  var animationLength = 5
  var lengthPerPoly = animationLength / dna.genes.length

  var polygons = dna.genes.map((gene, i) => {
    var str = ''
    for (let i = 0; i < gene.pos.length; i += 2)
      str += gene.pos[i] * width + ',' + gene.pos[i + 1] * height + ' '

    var color =
      'rgba(' +
      Math.floor(gene.color[0] * 255) +
      ',' +
      Math.floor(gene.color[1] * 255) +
      ',' +
      Math.floor(gene.color[2] * 255) +
      ',' +
      gene.color[3] +
      ')'

    var style = {
      fill: color,
      stroke: 'rgba(0, 0, 0, 0.05)',
      strokeWidth: 0,
      animationDelay: i * lengthPerPoly + 's',
    }
    return <polygon points={str} style={style} key={i} />
  })

  return (
    <svg height={height} width={width}>
      {polygons}
    </svg>
  )
}

export default DnaImage
