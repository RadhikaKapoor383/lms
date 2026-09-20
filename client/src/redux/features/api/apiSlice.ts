import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { userLoggedOut } from "../auth/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_SERVER_URI,
  credentials: "include", // send/receive the httpOnly access_token & refresh_token cookies
});

// Wraps the base query: if a request comes back unauthorized, try refreshing
// the access token once via /refresh, then retry the original request.
// If the refresh itself fails, the session is genuinely over - log out locally.
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 400) {
    const refreshResult = await rawBaseQuery(
      { url: "/refresh", method: "GET" },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(userLoggedOut());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Courses", "User", "Notifications", "Orders", "layout", "Announcements"],
  endpoints: () => ({}),
});
