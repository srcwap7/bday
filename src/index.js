import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { FoodPolling } from './shortPolling.js';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux'
import store from "./redux_utils/store.js"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RestaurantListingPage from "./RestaurantPage.js" 
import RestaurantItemsPage from './ItemsPage.js';
import SelectAddressPage from './SelectAddressPage.js';
import CartPage from './Cart.js';
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <Provider store={store}>
    <FoodPolling/>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App/>}/>
        <Route path="/explore" element={<RestaurantListingPage />} />
        <Route path="/res/:resId" element={<RestaurantItemsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/select-address" element={<SelectAddressPage />} />
      </Routes>
    </BrowserRouter>
  </Provider>
);

reportWebVitals();