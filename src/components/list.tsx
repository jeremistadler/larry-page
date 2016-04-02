import * as React from 'react';
import {Dna} from '../scripts/dna';
import DnaImage from './dna-image';
import DnaRenderer from './renderer-ui';


interface MainSectionProps {
};
interface MainSectionState {
  dna: Dna[];
};

declare var fetch: any;

class DnaList extends React.Component<MainSectionProps, MainSectionState> {
  constructor(props, context) {
    super(props, context);
    this.state = { dna: [] };

    fetch('http://larry-api.jeremi.se/api/organismsWithDna')
    .then((response) => {
        return response.json()
    })
    .then((response) => {
        this.setState({ dna: response });
    })
  }

  render() {
    const { } = this.props;
    const { dna } = this.state;

    if (!dna)
    return <div>Loading....</div>

    return (
        <div>
        <DnaRenderer dna={dna[0]} />
        <ul className="dna-list">
          {dna.map(todo =>
              <div className="dna-info">
                <DnaImage
                  key={todo.Organism.Id}
                  dna={todo}
                  width={200}
                  height={200}
                   />
               </div>
          )}
        </ul>
        </div>
    );
  }
}

export default DnaList;
