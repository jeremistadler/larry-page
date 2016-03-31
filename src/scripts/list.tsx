import * as React from 'react';
import {Dna} from './dna';
import DnaInfo from './dna-info';


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

    return (
        <ul className="dna-list">
          {dna.map(todo =>
            <DnaInfo
              key={todo.Organism.Id}
              dna={todo}/>
          )}
        </ul>
    );
  }
}

export default DnaList;
