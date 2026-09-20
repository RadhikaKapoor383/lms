import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Role } from "@/types/role";

// The fields the UI relies on are typed; the index signature keeps the rest
// of the server's user object (avatar, courses, timestamps...) usable.
export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  [key: string]: any;
}

interface AuthState {
  token: string;
  user: AuthUser | null;
}

const initialState: AuthState = {
  token: "",
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userRegistration: (
      state,
      action: PayloadAction<{ activationToken: string }>
    ) => {
      state.token = action.payload.activationToken;
    },
    userLoggedIn: (
      state,
      action: PayloadAction<{ accessToken: string; user: AuthUser }>
    ) => {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
    },
    userLoggedOut: (state) => {
      state.token = "";
      state.user = null;
    },
  },
});

export const { userRegistration, userLoggedIn, userLoggedOut } =
  authSlice.actions;

export default authSlice.reducer;
