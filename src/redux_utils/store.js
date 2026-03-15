import { configureStore } from '@reduxjs/toolkit'
import foodReducer from './foodSlice.js'
import cartReducer from './cartSlice.js'

export default configureStore({
  reducer: {
    food: foodReducer,
    cart: cartReducer
  },
})