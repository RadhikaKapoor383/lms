import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { sessionEnded, userLoggedOut } from "../auth/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_SERVER_URI,
  credentials: "include", // send/receive the httpOnly access_token & refresh_token cookies
});

// The server answers 401 when you are not (or no longer) logged in, and adds a
// "code" saying why:
//   SESSION_IDLE / SESSION_MAX  the login is over (inactive too long, or the hard
//                               time cap) -> log out and say why. Nothing to retry.
//   anything else               most often just an expired access token -> renew
//                               it once via /refresh and retry the request.
// Other errors (400 validation, 403, 404...) are passed through untouched, so a
// failed form is never sent twice.
const SESSION_OVER = ["SESSION_IDLE", "SESSION_MAX"];
const codeOf = (error: unknown): string | undefined => (error as any)?.data?.code;
const messageOf = (error: unknown): string =>
  (error as any)?.data?.message || "Your session has ended. Please log in again.";

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (SESSION_OVER.includes(codeOf(result.error) || "")) {
      api.dispatch(sessionEnded(messageOf(result.error)));
      return result;
    }

    const refreshResult = await rawBaseQuery(
      { url: "/refresh", method: "GET" },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else if (SESSION_OVER.includes(codeOf(refreshResult.error) || "")) {
      api.dispatch(sessionEnded(messageOf(refreshResult.error)));
    } else {
      api.dispatch(userLoggedOut());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Courses", "User", "Notifications", "Orders", "layout", "Announcements", "Categories", "Departments", "Enrollments", "Assignments", "Quizzes", "Certificates", "Discussions", "Reviews", "Instructors", "Settings", "Reports", "Materials"],
  endpoints: () => ({}),
});
