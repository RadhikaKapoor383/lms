import { apiSlice } from "../api/apiSlice";

const get = (url: string) => ({ url, method: "GET", credentials: "include" as const });

// refetchOnMountOrArgChange is set where these hooks are used: a dashboard
// should show fresh numbers each time you open it, not a copy cached a minute ago.
export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query({ query: () => get("admin/dashboard") }),
    getAdminAnalytics: builder.query({ query: () => get("admin/analytics") }),
    getInstructorDashboard: builder.query({ query: () => get("instructor/dashboard") }),
    getInstructorAnalytics: builder.query({ query: () => get("instructor/analytics") }),
    getStudentDashboard: builder.query({ query: () => get("student/dashboard") }),
    getStudentAnalytics: builder.query({ query: () => get("student/analytics") }),
    // Everything the student has finished, newest first. `limit` grows when they ask for earlier entries.
    getStudentLedger: builder.query({ query: (limit: number = 40) => get(`student/ledger?limit=${limit}`) }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useGetAdminAnalyticsQuery,
  useGetInstructorDashboardQuery,
  useGetInstructorAnalyticsQuery,
  useGetStudentDashboardQuery,
  useGetStudentAnalyticsQuery,
  useGetStudentLedgerQuery,
} = dashboardApi;
