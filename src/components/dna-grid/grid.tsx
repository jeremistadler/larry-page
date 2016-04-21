import * as React from 'react';
import {Dna} from '../../scripts/dna';
import {DnaApi} from '../../scripts/api';
import {Utils} from '../../scripts/utils';
import DnaImage from '../dna-image/dna-image';
declare var fetch: any;

interface MainSectionProps { };
interface MainSectionState {
    dnaList: Dna[];
};


class DnaGrid extends React.Component<MainSectionProps, MainSectionState> {
    constructor(props, context) {
      super(props, context);
      this.state = {
          dnaList: [1,2,3,4,5,6,7,8].map(f => Utils.createDna(0, '', f))
      }
  }

    componentWillMount(){
        DnaApi.fetchDnaList()
        .then(response => {
            this.setState({
                dnaList: response
            })
        });
    }

  render() {
    var { dnaList } = this.state;

    return (
        <div>
        <ul className="grid">
          {dnaList.map(dna => {
              var ratioW = 300 / dna.Organism.Width;
              var ratioH = 200 / dna.Organism.Height;
              var ratio = ratioW < ratioH?ratioW:ratioH;

              var width = dna.Organism.Width * ratio;
              var height = dna.Organism.Height * ratio;

              var floatRightStyle = {
                  float:'right'
              }

            return <div className="grid-image" key={dna.Organism.Id}>
              <DnaImage
                dna={dna}
                width={width}
                height={height} />
                 <div className="grid-image-info">
                    <span>{dna.Genes.length} genes</span>
                    <span style={floatRightStyle}>{dna.Mutation} mutations</span>
                 </div>
             </div>
          })}
        </ul>
        </div>
    );
  }
}

export default DnaGrid;
