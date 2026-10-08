import { apiSlice } from "../api/apiSlice";

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsersAdmin: builder.query({
      query: () => ({
        url: "admin/users",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["User"],
    }),

    updateUserRole: builder.mutation({
      query: ({ id, role }) => ({
        url: "admin/update-user-role",
        method: "PUT",
        body: { id, role },
        credentials: "include",
      }),
      invalidatesTags: ["User"],
    }),

    // deactivating signs the person out everywhere and blocks login; nothing is deleted
    setUserActive: builder.mutation({
      query: ({ id, active }: { id: string; active: boolean }) => ({
        url: `admin/users/${id}/status`,
        method: "PUT",
        body: { active },
        credentials: "include",
      }),
      invalidatesTags: ["User", "Instructors"],
    }),

    // only for students waiting for approval (when the platform requires it)
    setUserApproval: builder.mutation({
      query: ({ id, approve }: { id: string; approve: boolean }) => ({
        url: `admin/users/${id}/approval`,
        method: "PUT",
        body: { approve },
        credentials: "include",
      }),
      invalidatesTags: ["User"],
    }),

    deleteUserAdmin: builder.mutation({
      query: (id: string) => ({
        url: `admin/user/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetAllUsersAdminQuery,
  useUpdateUserRoleMutation,
  useSetUserActiveMutation,
  useSetUserApprovalMutation,
  useDeleteUserAdminMutation,
} = usersApi;