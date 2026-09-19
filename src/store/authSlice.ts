import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: { id: string; name: string; email: string; role: string; modulesAccess?: string[] } | null;
  token: string | null;
  isAuthenticated: boolean;
}

const savedToken = (typeof window !== 'undefined') ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null;
const savedUser = (typeof window !== 'undefined') ? (sessionStorage.getItem('user') || localStorage.getItem('user')) : null;

let parsedUser = null;
if (savedUser) {
  try {
    parsedUser = JSON.parse(savedUser);
  } catch (e) {
    parsedUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
    }
  }
}

const initialState: AuthState = {
  user: parsedUser,
  token: savedToken || null,
  isAuthenticated: !!savedToken,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthState['user']; token: string; rememberMe?: boolean }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      sessionStorage.setItem('token', action.payload.token);
      sessionStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
