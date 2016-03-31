import * as React from 'react';
import * as ReactDOM from 'react-dom';
import DnaList from './list';

var CommentBox = React.createClass({
  render: function() {
    return (
      <div className="commentBox">
        Hello, world! I am a CommentBox.
      </div>
    );
  }
});

ReactDOM.render(
  <DnaList />,
  document.getElementById('content')
);
