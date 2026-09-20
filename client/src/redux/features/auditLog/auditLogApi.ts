import { apiSlice } from "../api/apiSlice";

export const auditLogApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query({
      query: () => ({
        url: "admin/audit-logs",
        method: "GET",
        credentials: "include",
      }),
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditLogApi;