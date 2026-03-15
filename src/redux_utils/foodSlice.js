import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  dishes: {},        
  restaurants: {}, 
  bindings: [],    
  cart: null,
  lastUpdated: null,
};

const foodSlice = createSlice({
  name: 'food',
  initialState,
  reducers: {
    applyPollUpdate: (state, action) => {
      const { new: added, deleted, cart } = action.payload;

      added.dishes?.forEach((dish) => {
        state.dishes[dish.dish_id] = dish;
      });

      added.restaurants?.forEach((restaurant) => {
        state.restaurants[restaurant.res_id] = restaurant;
      });

      if (added.bindings?.length) {
        const existingKeys = new Set(
          state.bindings.map((b) => `${b.dish_id}__${b.res_id}`)
        );
        added.bindings.forEach((binding) => {
          const key = `${binding.dish_id}__${binding.res_id}`;
          if (!existingKeys.has(key)) {
            state.bindings.push(binding);
            existingKeys.add(key);
          }
        });
      }


      deleted.dishes?.forEach((dish) => {
        delete state.dishes[dish.dish_id];
      });

      deleted.restaurants?.forEach((restaurant) => {
        delete state.restaurants[restaurant.res_id];
      });

      if (deleted.bindings?.length) {
        const deletedKeys = new Set(
          deleted.bindings.map((b) => `${b.dish_id}__${b.res_id}`)
        );
        state.bindings = state.bindings.filter(
          (b) => !deletedKeys.has(`${b.dish_id}__${b.res_id}`)
        );
      }

      state.bindings = state.bindings.filter(
        (b) => state.dishes[b.dish_id] && state.restaurants[b.res_id]
      );

      // --- Update cart ---
      if (cart !== undefined) {
        state.cart = cart;
      }

      state.lastUpdated = Date.now();
    },

    clearFood: () => initialState,
  },
});

export const { applyPollUpdate, clearFood } = foodSlice.actions;
export default foodSlice.reducer;

const selectDishes = (state) => state.food.dishes;
const selectRestaurants = (state) => state.food.restaurants;
const selectBindings = (state) => state.food.bindings;

export const selectCart = (state) => state.food.cart;
export const selectLastUpdated = (state) => state.food.lastUpdated;

/** All dishes as an array */
export const selectAllDishes = createSelector(
  selectDishes,
  (dishes) => Object.values(dishes)
);

/** All restaurants as an array */
export const selectAllRestaurants = createSelector(
  selectRestaurants,
  (restaurants) => Object.values(restaurants)
);


export const selectEnrichedBindings = createSelector(
  selectBindings,
  selectDishes,
  selectRestaurants,
  (bindings, dishes, restaurants) =>
    bindings.map((b) => ({
      ...b,
      dishDetails: dishes[b.dish_id] ?? null,
      restaurantDetails: restaurants[b.res_id] ?? null,
    }))
);


export const selectByCuisine = (cuisine) =>
  createSelector(selectEnrichedBindings, (bindings) => {
    const normalized = cuisine?.toLowerCase();
    return bindings.filter((b) => b.cuisine?.toLowerCase() === normalized);
  });


export const selectByDishKeyword = (dishKeyword) =>
  createSelector(selectEnrichedBindings, (bindings) => {
    const normalized = dishKeyword?.toLowerCase();
    return bindings.filter((b) => b.dish?.toLowerCase() === normalized);
  });


export const selectAvailableCuisines = createSelector(
  selectBindings,
  (bindings) => [...new Set(bindings.map((b) => b.cuisine).filter(Boolean))]
);


export const selectAvailableDishKeywords = createSelector(
  selectBindings,
  (bindings) => [...new Set(bindings.map((b) => b.dish).filter(Boolean))]
);


export const selectDishById = (dishId) => (state) => state.food.dishes[dishId] ?? null;


export const selectRestaurantById = (resId) => (state) => state.food.restaurants[resId] ?? null;