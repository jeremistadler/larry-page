import * as React from 'react';
import {Dna} from './dna';


interface MainSectionProps {
    dna: Dna;
};
interface MainSectionState {
};

class DnaInfo extends React.Component<MainSectionProps, MainSectionState> {
  constructor(props, context) {
    super(props, context);
    this.state = { };
  }

  render() {
    const { dna } = this.props;
    const { } = this.state;

    var height = 200;
    var width = 200;

    var polygons = dna.Genes.map((gene, i) => {
        var str = '';
        for (let i = 0; i < gene.Pos.length; i += 2)
            str += (gene.Pos[i] * width) + ',' + (gene.Pos[i + 1] * height) + ' ';

        var color = 'rgba(' + Math.floor(gene.Color[0] * 255) + ',' +
                              Math.floor(gene.Color[1] * 255) + ',' +
                              Math.floor(gene.Color[2] * 255) + ',' +
                              gene.Color[3] + ')';
        var style = {
            fill: color,
            stroke: 'rgba(0, 0, 0, 0.05)',
            strokeWidth: 1
        }
        return <polygon points={str} style={style} key={i} />
    });

    return (
        <div className="dna-info">
            <svg height={height} width={width}>
                {polygons}
            </svg>
        </div>
    );
  }
}

export default DnaInfo;
