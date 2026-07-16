import { combineReducers } from 'redux';

import reducers from './index';

function createRootReducer() {
  return combineReducers({
    ...reducers,
  });
}

export type RootState = ReturnType<ReturnType<typeof createRootReducer>>;

export default createRootReducer;
