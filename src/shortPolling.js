import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { applyPollUpdate, selectAllRestaurants } from './redux_utils/foodSlice';
import { apiFetch } from './api';
 
function useFoodPolling(interval = 12000) {
  const dispatch    = useDispatch();
  const timerRef    = useRef(null);
  const restaurants = useSelector(selectAllRestaurants);
 
  useEffect(() => {
    const poll = async () => {
      try {
        const path = (!restaurants || restaurants.length === 0)
          ? "/?sessionStart=true"
          : "/";
 
        const res = await apiFetch(path);
        if (!res.ok) return;
 
        const data = await res.json();
        if (data.success) {
          dispatch(applyPollUpdate(data));
        }
      } catch (err) {
        console.error("[useFoodPolling] fetch failed:", err);
      }
    };
 
    poll();
    timerRef.current = setInterval(poll, interval);
    return () => clearInterval(timerRef.current);
  }, [interval, dispatch, restaurants]);
}
 
export function FoodPolling() {
  useFoodPolling(12000);
  return null;
}
 