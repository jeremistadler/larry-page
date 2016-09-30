import { Provider, connect } from 'react-redux';
import { createStore, bindActionCreators, combineReducers } from 'redux';


const loadDnaList = (dnaList) => {
  return {
    type: 'LOAD_DNA',
    dnaList
  }
}

const dnaReducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_DNA':
      return {
        id: action.id,
        text: action.text,
        completed: false
      }
    case 'TOGGLE_TODO':
      if (state.id !== action.id) {
        return state
      }

      return Object.assign({}, state, {
        completed: !state.completed
      })

    default:
      return state
  }
}

const dnaListReducer = (state = [], action) => {
  switch (action.type) {
    case 'CREATE_DNA':
      return [
        ...state,
        dnaReducer(undefined, action)
      ]
    case 'LOAD_DNA':
      return action.dnaList
    default:
      return state
  }
}


export const rootReducer = combineReducers({
  dnaListReducer
})
