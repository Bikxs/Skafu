// Typed Redux hooks for React components
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Typed version of useDispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Typed version of useSelector  
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;