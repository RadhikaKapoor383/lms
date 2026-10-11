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
  // Why the person was logged out by the system (idle / 2-hour cap), shown on
  // the login page. null = they logged out themselves or never logged in.
  endedReason: string | null;
}

const initialState: AuthState = {
  token: "",
  user: null,
  endedReason: null,
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
      state.endedReason = null;
    },
    userLoggedOut: (state) => {
      state.token = "";
      state.user = null;
    },
    // Logged out by the system, with a message for the login page.
    sessionEnded: (state, action: PayloadAction<string>) => {
      state.token = "";
      state.user = null;
      state.endedReason = action.payload;
    },
  },
});

export const { userRegistration, userLoggedIn, userLoggedOut, sessionEnded } =
  authSlice.actions;

export default authSlice.reducer;
