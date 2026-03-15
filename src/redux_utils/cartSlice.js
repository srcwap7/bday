import { createSlice, createSelector } from "@reduxjs/toolkit";

const initialState = {
  items: [], // [{ dish_id, dish_name, res_id, quantity }]
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {

    addToCart: (state, action) => {
      const { dish_id, dish_name, res_name,res_id, dish_image } = action.payload;

      const existing = state.items.find(
        (i) => String(i.dish_id) === String(dish_id)
      );

      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({
          dish_id,
          dish_name,
          res_name,
          dish_image,
          res_id,
          quantity: 1
        });
      }
    },

    removeFromCart: (state, action) => {
      const { dish_id } = action.payload;

      const idx = state.items.findIndex(
        (i) => String(i.dish_id) === String(dish_id)
      );

      if (idx === -1) return;

      if (state.items[idx].quantity > 1) {
        state.items[idx].quantity -= 1;
      } else {
        state.items.splice(idx, 1);
      }
    },

    dropFromCart: (state, action) => {
      const { dish_id } = action.payload;

      state.items = state.items.filter(
        (i) => String(i.dish_id) !== String(dish_id)
      );
    },

    setQuantity: (state, action) => {
      const { dish_id, quantity } = action.payload;

      const idx = state.items.findIndex(
        (i) => String(i.dish_id) === String(dish_id)
      );

      if (idx === -1) return;

      if (quantity <= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items[idx].quantity = quantity;
      }
    },

    clearCart: () => initialState,

    syncCartFromServer: (state, action) => {
      if (!action.payload) return;

      state.items = action.payload.map((item) => ({
        dish_id: item.dish_id,
        dish_name: item.dish_name,
        res_name: item.res_name,
        res_id: item.res_id,
        dish_image: item.dish_image,
        quantity: item.quantity ?? 1,
      }));
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  dropFromCart,
  setQuantity,
  clearCart,
  syncCartFromServer,
} = cartSlice.actions;

export default cartSlice.reducer;

export const selectCartItems = (state) => state.cart.items;

export const selectCartLineCount = (state) => state.cart.items.length;

export const selectCartTotalUnits = createSelector(
  selectCartItems,
  (items) => items.reduce((sum, i) => sum + i.quantity, 0)
);

export const selectCartHasItems = createSelector(
  selectCartItems,
  (items) => items.length > 0
);

export const selectItemQuantity = (dish_id) => (state) => {
  const item = state.cart.items.find(
    (i) => String(i.dish_id) === String(dish_id)
  );
  return item?.quantity ?? 0;
};

export const selectIsInCart = (dish_id) => (state) =>
  state.cart.items.some(
    (i) => String(i.dish_id) === String(dish_id)
  );