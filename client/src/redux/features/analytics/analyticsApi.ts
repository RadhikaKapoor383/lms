import { apiSlice } from "../api/apiSlice";

export const analyticsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsersAnalytics: builder.query({
      query: () => ({
        url: "admin/users-analytics",
        method: "GET",
        credentials: "include",
      }),
    }),

    getCoursesAnalytics: builder.query({
      query: () => ({
        url: "admin/courses-analytics",
        method: "GET",
        credentials: "include",
      }),
    }),

    getOrdersAnalytics: builder.query({
      query: () => ({
        url: "admin/orders-analytics",
        method: "GET",
        credentials: "include",
      }),
    }),
  }),
});

export const {
  useGetUsersAnalyticsQuery,
  useGetCoursesAnalyticsQuery,
  useGetOrdersAnalyticsQuery,
} = analyticsApi;