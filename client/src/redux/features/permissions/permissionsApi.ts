import { apiSlice } from "../api/apiSlice";

export const permissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // admin: [{ key, role, label, allowed }]
    getRolePermissions: builder.query({
      query: () => ({ url: "admin/permissions", method: "GET", credentials: "include" }),
      providesTags: ["Permissions"],
    }),
    // admin: { instructor?: { key: boolean }, student?: { key: boolean } }
    updateRolePermissions: builder.mutation({
      query: (body: Record<string, Record<string, boolean>>) => ({
        url: "admin/permissions",
        method: "PUT",
        body,
        credentials: "include",
      }),
      invalidatesTags: ["Permissions"],
    }),
    // anyone signed in: the keys my role may use
    getMyPermissions: builder.query({
      query: () => ({ url: "my-permissions", method: "GET", credentials: "include" }),
      providesTags: ["Permissions"],
    }),
  }),
});

export const { useGetRolePermissionsQuery, useUpdateRolePermissionsMutation, useGetMyPermissionsQuery } = permissionsApi;
