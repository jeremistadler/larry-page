import {combineReducers} from 'redux'

type DnaReducerState = {
  id: string
  text: string
  completed: boolean
}

const dnaReducer = (
  state: DnaReducerState,
  action:
    | {type: 'CREATE_DNA'; id: string; text: string}
    | {type: 'TOGGLE_TODO'; id: string},
) => {
  switch (action.type) {
    case 'CREATE_DNA':
      return {
        id: action.id,
        text: action.text,
        completed: false,
      }
    case 'TOGGLE_TODO':
      if (state.id !== action.id) {
        return state
      }

      return Object.assign({}, state, {
        completed: !state.completed,
      })

    default:
      return state
  }
}

const dnaListReducer = (
  state: DnaReducerState[] = [],
  action:
    | {type: 'CREATE_DNA'; id: string; text: string}
    | {type: 'TOGGLE_TODO'; id: string}
    | {type: 'LOAD_DNA'; dnaList: DnaReducerState[]},
) => {
  switch (action.type) {
    case 'CREATE_DNA':
      return [...state, dnaReducer(undefined as any, action)]
    case 'LOAD_DNA':
      return action.dnaList
    default:
      return state
  }
}

export const rootReducer = combineReducers({
  dnaListReducer,
})
