import * as React from 'react';
import * as ReactDOM from 'react-dom';
import DnaGrid from './dna-grid/grid';
import DnaRenderer from './dna-renderer/renderer';
import Uploader from './uploader/uploader';
import { Provider, connect } from 'react-redux';
import { createStore, bindActionCreators, combineReducers } from 'redux';
import {rootReducer} from '../scripts/reducers';


class AppState { }
class AppProps {
    dnaList: any;
    actions: any;
}


class App extends React.Component<AppProps, AppState> {
    render() {
    const { dnaList, actions } = this.props
    return (<div>
            <DnaRenderer />
            <Uploader />
            <DnaGrid />
            </div>)
    }
}


function mapStateToProps(state) {
  return {
    todos: state.todos
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(TodoActions, dispatch)
  }

connect(
  mapStateToProps,
  mapDispatchToProps
)(App)


const store = createStore(rootReducer, {});




ReactDOM.render(
  <Provider store={store}>
      <App dnaList={store.dnaList} actions={store.actions} />
  </Provider>,
  document.getElementById('root')
)
