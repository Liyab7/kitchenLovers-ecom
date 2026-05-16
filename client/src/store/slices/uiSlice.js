import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'ui',
  initialState: { mobileMenuOpen: false, cartDrawerOpen: false },
  reducers: {
    setMobileMenu: (s, a) => { s.mobileMenuOpen = a.payload; },
    setCartDrawer: (s, a) => { s.cartDrawerOpen = a.payload; },
  },
});

export const { setMobileMenu, setCartDrawer } = slice.actions;
export default slice.reducer;
