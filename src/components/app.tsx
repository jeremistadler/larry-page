import * as React from 'react';
import * as ReactDOM from 'react-dom';
import DnaGrid from './dna-grid/grid';
import DnaRenderer from './dna-renderer/renderer';
import Uploader from './uploader/uploader';

ReactDOM.render(
    <div>
        <DnaRenderer />
        <DnaGrid />
        <Uploader />
    </div>,
  document.getElementById('content')
);
